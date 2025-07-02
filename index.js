// index.js - A VERSÃO FINAL COM PUPPETEER PARA INTERAÇÃO

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer'); // Nossa ferramenta de navegação
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não foi definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função que usa o Puppeteer para visitar, clicar e extrair o texto
async function extrairTextoInteragindo(url) {
  console.log(`Robô: Iniciando navegador para interagir com: ${url}`);
  let browser = null;
  try {
    const launchOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote'],
      headless: true
    };
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log(`Robô: Página carregada. Extraindo texto visível...`);
    // Extrai o texto da página inteira, incluindo o que pode estar em popups/modais
    const textoCompleto = await page.evaluate(() => document.body.innerText);

    return textoCompleto;
  } catch (error) {
    console.error(`Robô: Erro no Puppeteer com a URL ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
      console.log("Robô: Navegador invisível fechado.");
    }
  }
}

// Função da IA (sempre a mesma, ela só quer texto)
async function analisarTextoComIA(texto) {
    // ... (código da função da IA que já tínhamos, não muda) ...
    if (!texto || texto.length < 20) return null;
    try {
        console.log("Robô: Enviando texto para a IA...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Você é um especialista em analisar documentos e páginas de licitações. O texto a seguir foi extraído de uma página web, potencialmente de um popup ou modal. Sua tarefa é encontrar TODAS as empresas que estão com o status "Desclassificada" ou "Inabilitada". Para cada empresa, extraia: 1. razaoSocial, 2. cnpj (se houver), 3. motivoDaPerda (resumido). Retorne um array de objetos JSON. Se não encontrar nada, retorne um array vazio []. TEXTO: """ ${texto.substring(0, 50000)} """`;
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

// O Endpoint principal que orquestra tudo
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise INTERATIVA!");
  // A extensão agora sempre envia uma lista de URLs de "pistas"
  const pistas = req.body.pistas; 

  if (!pistas || !Array.isArray(pistas) || pistas.length === 0) {
    return res.status(200).json([]); // Retorna sucesso com lista vazia
  }

  const resultadosFinais = [];
  for (const url of pistas) {
    // O robô agora usa sua nova habilidade de navegação
    const textoExtraido = await extrairTextoInteragindo(url);
    if (textoExtraido) {
      const analiseIA = await analisarTextoComIA(textoExtraido);
      if (analiseIA && Array.isArray(analiseIA) && analiseIA.length > 0) {
         analiseIA.forEach(item => item.fonte = url);
         resultadosFinais.push(...analiseIA);
      }
    }
  }

  console.log(`Robô: Análise interativa completa. Enviando ${resultadosFinais.length} resultados.`);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão INTERATIVA FINAL) rodando na porta ${PORT}`);
});