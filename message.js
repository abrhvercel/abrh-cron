export const getWhatsappNotifyMessage = (data) => {
  return `
    Prezado(a) ${data.client},
    Gostaríamos de lembrá-lo(a) que o status da sua inscrição para o evento ${data.event} se encontra pendente. Para garantir a sua participação, solicitamos que o pagamento seja realizado até [Data Limite para Pagamento].
    Detalhes da Inscrição:
      •	Nome do Evento: ${data.event}
      •	Valor da Inscrição: R$ ${data.purchaseValue} - Caso for possível
    Caso já tenha realizado o pagamento, desconsidere esta mensagem. Se precisar de qualquer assistência ou tiver dúvidas, não hesite em nos contatar.
    Agradecemos à sua atenção e esperamos vê-lo(a) no evento!
    Atenciosamente,
    ABRH Brasil
  `;
};

export const getEmailNotifyMessage = (data) => {
  return `
    Prezado(a) ${data.client},
    Gostaríamos de lembrá-lo(a) que o status da sua inscrição para o evento ${data.event} se encontra pendente. Para garantir a sua participação, solicitamos que o pagamento seja realizado até [Data Limite para Pagamento].
    Detalhes da Inscrição:
      •	Nome do Evento: ${data.event}
      •	Valor da Inscrição: R$ ${data.purchaseValue} - Caso for possível
    Caso já tenha realizado o pagamento, desconsidere esta mensagem. Se precisar de qualquer assistência ou tiver dúvidas, não hesite em nos contatar.
    Agradecemos à sua atenção e esperamos vê-lo(a) no evento!
    Atenciosamente,
    ABRH Brasil
  `;
};

export const getWhatsappCancelMessage = (data) => {
  return `
    Prezado(a) ${data.client},
    Lamentamos informar que não identificamos o pagamento de sua inscrição para o evento ${data.event} e, por isso, sua inscrição foi cancelada.
    Caso tenha efetuado o pagamento, envie o comprovante para o e-mail congressista@abrhbrasil.org.br para que possamos analisar e regularizar sua inscrição.
    Agradecemos à sua compreensão e estamos disponíveis para qualquer dúvida ou assistência necessária.
    Atenciosamente,
    ABRH Brasil
  `;
};

export const getEmailCancelMessage = (data) => {
  return `
    Prezado(a) ${data.client},
    Lamentamos informar que não identificamos o pagamento de sua inscrição para o evento ${data.event} e, por isso, sua inscrição foi cancelada.
    Caso tenha efetuado o pagamento, envie o comprovante para o e-mail congressista@abrhbrasil.org.br para que possamos analisar e regularizar sua inscrição.
    Agradecemos à sua compreensão e estamos disponíveis para qualquer dúvida ou assistência necessária.
    Atenciosamente,
    ABRH Brasil
  `;
};

// Para efetuar o pagamento, utilize o seguinte link: [Link para Pagamento]
