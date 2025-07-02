// index.js - A versão CORRETA para analisar o texto da página

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// A função de análise com IA continua a mesma
async function analisarTextoComIA(texto) {
  if (!texto || texto.length < 50) {
    return [{ erro: "Conteúdo da página insuficiente para análise." }];
  }
  try {
    console.log("Robô: Enviando texto da página para análise da IA...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um especialista em analisar páginas de resultados de licitações públicas brasileiras.
      Analise o texto completo fornecido a seguir.
      Sua tarefa é encontrar TODAS as empresas que estão com o status "Desclassificada" ou "Inabilitada".
      Para cada uma dessas empresas, extraia as seguintes informações:
      1. razaoSocial: O nome completo da empresa.
      2. cnpj: O CNPJ da empresa.
      3. motivoDaPerda: Se houver alguma informação sobre o motivo, resuma-a. Se não houver, retorne "Motivo não especificado na página".
      Retorne o resultado como um array de objetos JSON. Se nenhuma empresa desclassificada for encontrada, retorne um array vazio [].

      TEXTO PARA ANÁLISE:
      """
      ${texto.substring(0, 30000)}
      """
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("Robô: Análise da IA concluída.");
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Robô: Erro ao analisar com a IA:", error);
    return [{ erro: `Falha na análise da IA: ${error.message}` }];
  }
}

// O Endpoint principal, agora corrigido
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise de página completa!");

  // CORREÇÃO: Estamos esperando 'textoDaPagina', não 'pistas'
  const textoDaPagina = req.body.textoDaPagina;

  if (!textoDaPagina) {
    return res.status(400).json([{ message: "Nenhum texto de página foi enviado." }]);
  }

  // Não há loop. A análise é feita diretamente no texto recebido.
  const analiseIA = await analisarTextoComIA(textoDaPagina);

  console.log("Robô: Análise completa. Enviando resultado de volta.");
  res.status(200).json(analiseIA);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão Super-Analista CORRETA) rodando na porta ${PORT}`);
});