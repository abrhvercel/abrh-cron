import pocketbaseClient from "../db/pocketbase.js";
import { nfeDuplicateController } from "./nfe-duplicate-control.js";
import { LOG } from "./log.js";

/**
 * Monitor de NFe para análise de duplicidade e performance
 */
export class NFEMonitor {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      errors: 0,
      duplicates: 0,
      lastRun: null
    };
  }

  /**
   * Gera relatório completo de NFe
   */
  async generateReport() {
    const dbClient = await pocketbaseClient.getClient();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {},
      duplicates: [],
      errors: [],
      recommendations: []
    };

    try {
      // Estatísticas gerais
      const allProcesses = await dbClient.collection("data").getFullList({
        filter: "nfseCronStatus != ''"
      });

      const successful = allProcesses.filter(p => p.nfseCronStatus === "PROCESSED_CRON");
      const errors = allProcesses.filter(p => p.nfseCronStatus === "ERROR");
      const processing = allProcesses.filter(p => p.nfseCronStatus === "PROCESSING");
      const waiting = allProcesses.filter(p => p.nfseCronStatus === "WAITING_CRON");

      report.summary = {
        total: allProcesses.length,
        successful: successful.length,
        errors: errors.length,
        processing: processing.length,
        waiting: waiting.length,
        successRate: (successful.length / allProcesses.length * 100).toFixed(2) + "%"
      };

      // Identificar duplicatas
      const duplicateProcesses = await this.findDuplicateProcesses(dbClient);
      report.duplicates = duplicateProcesses;

      // Identificar erros recorrentes
      const errorProcesses = await this.findErrorProcesses(dbClient);
      report.errors = errorProcesses;

      // Gerar recomendações
      report.recommendations = this.generateRecommendations(report);

      return report;

    } catch (error) {
      LOG(`Erro ao gerar relatório: ${error.message}`);
      return null;
    }
  }

  /**
   * Encontra processos com possíveis duplicatas
   */
  async findDuplicateProcesses(dbClient) {
    try {
      const processes = await dbClient.collection("data").getFullList({
        filter: "nfseId != null && nfseId != ''"
      });

      const processMap = new Map();
      const duplicates = [];

      processes.forEach(process => {
        if (!processMap.has(process.process)) {
          processMap.set(process.process, []);
        }
        processMap.get(process.process).push(process);
      });

      // Encontrar processos com múltiplas NFe
      for (const [processId, nfes] of processMap.entries()) {
        if (nfes.length > 1) {
          duplicates.push({
            processId,
            count: nfes.length,
            nfes: nfes.map(nfe => ({
              id: nfe.id,
              nfseId: nfe.nfseId,
              status: nfe.nfseStatus,
              cronStatus: nfe.nfseCronStatus,
              createdAt: nfe.created,
              lastAttempt: nfe.nfseLastAttempt
            }))
          });
        }
      }

      return duplicates;
    } catch (error) {
      LOG(`Erro ao encontrar duplicatas: ${error.message}`);
      return [];
    }
  }

  /**
   * Encontra processos com erros recorrentes
   */
  async findErrorProcesses(dbClient) {
    try {
      const errorProcesses = await dbClient.collection("data").getFullList({
        filter: "nfseCronStatus = 'ERROR' && nfseCronAttempts > 1"
      });

      return errorProcesses.map(process => ({
        processId: process.process,
        attempts: process.nfseCronAttempts,
        lastError: process.nfseLastError,
        error: process.nfseCronError,
        nfseId: process.nfseId
      }));
    } catch (error) {
      LOG(`Erro ao encontrar processos com erro: ${error.message}`);
      return [];
    }
  }

  /**
   * Gera recomendações baseadas no relatório
   */
  generateRecommendations(report) {
    const recommendations = [];

    if (report.duplicates.length > 0) {
      recommendations.push({
        type: "DUPLICATE_CLEANUP",
        priority: "HIGH",
        message: `${report.duplicates.length} processos com duplicatas encontrados. Recomenda-se revisão manual.`,
        action: "Revisar e consolidar NFe duplicadas"
      });
    }

    if (report.errors.length > 0) {
      recommendations.push({
        type: "ERROR_INVESTIGATION",
        priority: "MEDIUM",
        message: `${report.errors.length} processos com erros recorrentes. Investigar causas.`,
        action: "Analisar logs de erro e corrigir problemas de integração"
      });
    }

    const successRate = parseFloat(report.summary.successRate);
    if (successRate < 80) {
      recommendations.push({
        type: "PERFORMANCE_ISSUE",
        priority: "HIGH",
        message: `Taxa de sucesso baixa: ${report.summary.successRate}. Investigar problemas de integração.`,
        action: "Revisar configurações da API e logs de erro"
      });
    }

    return recommendations;
  }

  /**
   * Exporta relatório para arquivo
   */
  async exportReport(filename = null) {
    const report = await this.generateReport();
    if (!report) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `nfe-report-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    try {
      const fs = await import('fs');
      await fs.promises.writeFile(finalFilename, JSON.stringify(report, null, 2));
      LOG(`Relatório exportado para: ${finalFilename}`);
      return finalFilename;
    } catch (error) {
      LOG(`Erro ao exportar relatório: ${error.message}`);
      return null;
    }
  }

  /**
   * Monitora em tempo real
   */
  async startRealTimeMonitoring(intervalMs = 60000) {
    LOG("Iniciando monitoramento em tempo real de NFe...");
    
    const monitor = async () => {
      const report = await this.generateReport();
      if (report) {
        LOG(`Monitor NFe - Sucessos: ${report.summary.successful}, Erros: ${report.summary.errors}, Duplicatas: ${report.duplicates.length}`);
        
        if (report.recommendations.length > 0) {
          LOG("Recomendações:");
          report.recommendations.forEach(rec => {
            LOG(`- ${rec.type}: ${rec.message}`);
          });
        }
      }
    };

    // Executar imediatamente
    await monitor();
    
    // Configurar intervalo
    return setInterval(monitor, intervalMs);
  }
}

// Instância singleton
export const nfeMonitor = new NFEMonitor();
