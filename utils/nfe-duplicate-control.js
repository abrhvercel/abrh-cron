import pocketbaseClient from "../db/pocketbase.js";
import { LOG } from "./log.js";

/**
 * Utilitário para controle de duplicidade de NFe
 */
export class NFEDuplicateController {
  constructor() {
    this.processingLocks = new Map(); // Cache de locks por processo
  }

  /**
   * Verifica se uma NFe já foi emitida para um processo específico
   * @param {string} processId - ID do processo
   * @param {string} nfseId - ID da NFe (opcional)
   * @returns {Promise<Object>} - Resultado da verificação
   */
  async checkDuplicateNFe(processId, nfseId = null) {
    const dbClient = await pocketbaseClient.getClient();
    
    try {
      // Buscar todas as NFe para este processo
      const existingNFes = await dbClient.collection("data").getFullList({
        filter: `process = '${processId}' && nfseId != null && nfseId != ''`
      });

      if (existingNFes.length === 0) {
        return { isDuplicate: false, existingNFe: null };
      }

      // Verificar se alguma NFe está em status de sucesso
      const successfulNFe = existingNFes.find(nfe => 
        nfe.nfseCronStatus === "PROCESSED_CRON" || 
        nfe.nfseStatus === "authorized" ||
        nfe.nfseStatus === "issued"
      );

      if (successfulNFe) {
        return {
          isDuplicate: true,
          existingNFe: successfulNFe,
          reason: "NFe já emitida com sucesso",
          shouldBlock: true
        };
      }

      // Verificar se há NFe com erro recente (últimas 24h)
      const recentErrorNFe = existingNFes.find(nfe => {
        if (nfe.nfseCronStatus === "ERROR" && nfe.nfseLastError) {
          const lastError = new Date(nfe.nfseLastError);
          const now = new Date();
          const hoursDiff = (now - lastError) / (1000 * 60 * 60);
          return hoursDiff < 24; // Erro nas últimas 24h
        }
        return false;
      });

      if (recentErrorNFe) {
        return {
          isDuplicate: true,
          existingNFe: recentErrorNFe,
          reason: "NFe com erro recente - requer intervenção manual",
          shouldBlock: true
        };
      }

      // Se chegou até aqui, há NFe mas sem erro recente - permitir nova tentativa
      return {
        isDuplicate: false,
        existingNFe: existingNFes[0],
        reason: "NFe anterior com erro antigo - permitindo nova tentativa"
      };

    } catch (error) {
      LOG(`Erro ao verificar duplicidade para processo ${processId}: ${error.message}`);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Obtém lock para processamento de um processo específico
   * @param {string} processId - ID do processo
   * @returns {boolean} - True se conseguiu o lock, false se já está sendo processado
   */
  getProcessingLock(processId) {
    if (this.processingLocks.has(processId)) {
      return false;
    }
    
    this.processingLocks.set(processId, {
      timestamp: new Date(),
      processId: processId
    });
    
    return true;
  }

  /**
   * Libera o lock de processamento
   * @param {string} processId - ID do processo
   */
  releaseProcessingLock(processId) {
    this.processingLocks.delete(processId);
  }

  /**
   * Limpa locks antigos (mais de 1 hora)
   */
  cleanupOldLocks() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [processId, lock] of this.processingLocks.entries()) {
      if (lock.timestamp < oneHourAgo) {
        this.processingLocks.delete(processId);
        LOG(`Lock antigo removido para processo: ${processId}`);
      }
    }
  }

  /**
   * Registra tentativa de emissão de NFe
   * @param {string} processId - ID do processo
   * @param {string} nfseId - ID da NFe
   * @param {string} status - Status da NFe
   * @param {Object} error - Erro (se houver)
   */
  async logNFeAttempt(processId, nfseId, status, error = null) {
    const dbClient = await pocketbaseClient.getClient();
    
    try {
      const logData = {
        processId,
        nfseId,
        status,
        timestamp: new Date().toISOString(),
        error: error ? JSON.stringify(error) : null,
        processedBy: "CRON_SYSTEM"
      };

      // Aqui você pode salvar em uma tabela de logs se necessário
      LOG(`NFe Log - Processo: ${processId}, NFe: ${nfseId}, Status: ${status}`);
      
    } catch (error) {
      LOG(`Erro ao registrar log de NFe: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas de duplicidade
   * @returns {Promise<Object>} - Estatísticas
   */
  async getDuplicateStats() {
    const dbClient = await pocketbaseClient.getClient();
    
    try {
      const totalProcesses = await dbClient.collection("data").getFullList({
        filter: "nfseCronStatus != ''"
      });

      const duplicateProcesses = await dbClient.collection("data").getFullList({
        filter: "nfseCronStatus = 'ERROR' && nfseCronAttempts > 1"
      });

      return {
        totalProcesses: totalProcesses.length,
        duplicateProcesses: duplicateProcesses.length,
        duplicateRate: duplicateProcesses.length / totalProcesses.length * 100
      };
    } catch (error) {
      LOG(`Erro ao obter estatísticas: ${error.message}`);
      return null;
    }
  }
}

// Instância singleton
export const nfeDuplicateController = new NFEDuplicateController();
