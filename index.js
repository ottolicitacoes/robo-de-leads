// index.js - A VERSÃO FINALÍSSIMA, QUE ENTENDE DIFERENTES ESTRATÉGIAS

const express = require('express');
const cors = require('cors');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Vamos usar o axios para ler os PDFs, o Puppeteer não será mais necessário aqui
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: GEMINI_API_KEY não definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extrairTextoDePDF(url) {
  try {
    console.log(`Robô: Lendo PDF de: ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const data = await pdf(response.data);
    return data.text;
  } catch (error) {
    console.error(`Robô: Erro ao ler PDF da URL ${url}:`, error.message);
    return "";
  }
}

async function analisarTextoComIA(texto) {
  // ... (código da função da IA continua o mesmo) ...
  if (!texto || texto.length < 20) return [];
  try {
    console.log("Robô: Enviando texto para a IA...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um especialista em analisar documentos de licitações. Analise o texto a seguir. Sua tarefa é encontrar TODAS as empresas com status "Desclassificada" ou "Inabilitada". Para cada empresa, extraia: 1. razaoSocial, 2. cnpj (se houver), 3. motivoDaPerda (resumido). Retorne um array de objetos JSON. Se não encontrar nada, retorne um array vazio []. TEXTO: """ ${texto.substring(0, 50000)} """`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Robô: Erro ao analisar com a IA:", error);
    return [{ erro: `Falha na análise da IA: ${error.message}` }];
  }
}

app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido com estratégia!");
  const pista = req.body.pista;

  if (!pista || !pista.tipo || !pista.dados) {
    return res.status(400).json([]);
  }

  let textoParaAnalisar = "";

  if (pista.tipo === 'texto_completo') {
    console.log("Robô: Processando pista do tipo 'texto_completo'.");
    textoParaAnalisar = pista.dados;

  } else if (pista.tipo === 'lista_de_urls') {
    console.log(`Robô: Processando pista do tipo 'lista_de_urls' com ${pista.dados.length} links.`);
    // Para cada URL, baixa o conteúdo (assumindo que são PDFs por enquanto) e junta o texto
    let textosCombinados = [];
    for (const url of pista.dados) {
      const textoDoPDF = await extrairTextoDePDF(url);
      textosCombinados.push(textoDoPDF);
    }
    textoParaAnalisar = textosCombinados.join("\n\n --- FIM DO DOCUMENTO --- \n\n");
  }

  if (textoParaAnalisar) {
    const resultadosFinais = await analisarTextoComIA(textoParaAnalisar);
    console.log(`Robô: Análise da estratégia completa. Enviando ${resultadosFinais.length} resultados.`);
    res.status(200).json(resultadosFinais);
  } else {
    res.status(200).json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão CAMALEÃO FINAL) rodando na porta ${PORT}`);
});