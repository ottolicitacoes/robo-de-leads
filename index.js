// index.js - A VERSÃO FINAL E POLIVALENTE (com "inabilitado" na IA)

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não foi definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extrairTextoDaUrl(url) {
  console.log(`Robô: Investigando a URL: ${url}`);
  if (url.toLowerCase().endsWith('.pdf')) {
    console.log("Robô: Detectado link de PDF. Usando o leitor de PDF...");
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const data = await pdf(response.data);
      return data.text;
    } catch (error) {
      console.error(`Robô: Erro ao ler o PDF da URL ${url}:`, error.message);
      return null;
    }
  }

  console.log("Robô: Detectada página HTML. Usando o navegador Puppeteer...");
  let browser = null;
  try {
    const launchOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote', '--disable-gpu'],
      headless: true
    };
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const textoCompleto = await page.evaluate(() => document.body.innerText);
    return textoCompleto;
  } catch (error) {
    console.error(`Robô: Erro no Puppeteer com a URL ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function analisarTextoComIA(texto) {
  if (!texto || texto.length < 20) return null;
  try {
    console.log("Robô: Enviando texto para a IA...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // ATUALIZAMOS O PROMPT AQUI PARA INCLUIR "INABILITADA"
    const prompt = `Você é um especialista em analisar documentos de licitações. O texto a seguir foi extraído de uma página HTML ou de um documento PDF. Sua tarefa é encontrar TODAS as empresas com status "Desclassificada" ou "Inabilitada". Para cada empresa, extraia: 1. razaoSocial, 2. cnpj (se houver), 3. motivoDaPerda (resumido). Retorne um array de objetos JSON. Se não encontrar nada, retorne um array vazio []. TEXTO: """ ${texto.substring(0, 50000)} """`;
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

app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise polivalente (HTML/PDF)!");
  const pistas = req.body.pistas;
  if (!pistas || !Array.isArray(pistas) || pistas.length === 0) {
    return res.status(200).json([]);
  }

  const resultadosFinais = [];
  for (const url of pistas) {
    const textoExtraido = await extrairTextoDaUrl(url);
    if (textoExtraido) {
      const analiseIA = await analisarTextoComIA(textoExtraido);
      if (analiseIA && Array.isArray(analiseIA) && analiseIA.length > 0) {
         analiseIA.forEach(item => item.fonte = url);
         resultadosFinais.push(...analiseIA);
      }
    }
  }
  console.log(`Robô: Análise polivalente completa. Enviando ${resultadosFinais.length} resultados.`);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão POLIVALENTE FINAL) rodando na porta ${PORT}`);
});