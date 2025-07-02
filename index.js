// index.js - A versão final e inteligente do nosso Super-Robô

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURAÇÃO ---
const app = express();
app.use(cors());
app.use(express.json());

// Pega a chave secreta que configuramos no Render
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNÇÕES DE AJUDA ---

// Função para buscar o conteúdo de uma página HTML
async function buscarConteudoUrl(url) {
  try {
    console.log(`Buscando conteúdo de: ${url}`);
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
    const html = response.data;
    const $ = cheerio.load(html);
    const texto = $('body').text().replace(/\s\s+/g, ' ').trim();
    console.log(`Conteúdo extraído com sucesso.`);
    return texto;
  } catch (error) {
    console.error(`Erro ao buscar a URL ${url}:`, error.message);
    return null;
  }
}

// Função para chamar a IA do Gemini
async function analisarTextoComIA(texto) {
  if (!texto || texto.length < 50) {
    console.log("Texto muito curto ou nulo para análise da IA.");
    return { erro: "Conteúdo da página insuficiente para análise." };
  }
  try {
    console.log("Enviando texto para a IA do Gemini...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um especialista em analisar documentos de licitações públicas brasileiras.
      Analise o texto a seguir e extraia as seguintes informações em formato JSON.
      - Para cada campo, se a informação não for encontrada, retorne "N/A".
      - Nos campos "motivoDaPerda" e "objetoDaLicitacao", resuma a informação em no máximo 20 palavras.

      Informações a extrair:
      1.  razaoSocial: O nome da empresa que foi desclassificada ou inabilitada.
      2.  cnpj: O CNPJ da empresa desclassificada.
      3.  motivoDaPerda: O resumo do motivo exato pelo qual a empresa perdeu.
      4.  objetoDaLicitacao: O resumo do objeto principal da licitação.
      5.  orgaoLicitante: O nome do órgão público que realizou a licitação.
      6.  modalidade: A modalidade da licitação (ex: Pregão Eletrônico, Dispensa).
      7.  numeroDoProcesso: O número do processo ou do edital.

      TEXTO PARA ANÁLISE:
      """
      ${texto.substring(0, 15000)}
      """
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("Análise da IA concluída com sucesso.");
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Erro ao analisar com a IA:", error.message);
    return { erro: "Falha na análise da IA" };
  }
}

// --- O ENDEREÇO PRINCIPAL DO ROBÔ ---
app.post('/analisar', async (req, res) => {
  console.log("Robô recebeu um pedido de análise com IA!");
  const pistas = req.body.pistas;

  if (!pistas || pistas.length === 0) {
    return res.status(400).json({ message: "Nenhuma pista foi enviada." });
  }

  // Por enquanto, vamos analisar apenas a PRIMEIRA pista da lista
  const urlParaAnalisar = pistas[0];
  console.log(`Analisando a pista: ${urlParaAnalisar}`);

  const conteudo = await buscarConteudoUrl(urlParaAnalisar);
  const analiseIA = await analisarTextoComIA(conteudo);

  res.status(200).json([analiseIA]); // Enviamos o resultado dentro de uma lista
});

// --- LIGANDO O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô com IA rodando na porta ${PORT}`);
});