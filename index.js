// index.js - Versão Otimizada para Baixa Memória

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function buscarConteudoComPuppeteer(url) {
  console.log(`Robô: Iniciando busca com Puppeteer para: ${url}`);
  let browser = null;
  try {
    // Argumentos de otimização para rodar em ambientes como o Render
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true
    };

    console.log("Robô: 1. Lançando o navegador...");
    browser = await puppeteer.launch(launchOptions);

    console.log("Robô: 2. Navegador lançado. Abrindo nova página...");
    const page = await browser.newPage();

    console.log("Robô: 3. Página aberta. Navegando para a URL...");
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("Robô: 4. Página carregada. Extraindo texto...");
    const textoCompleto = await page.evaluate(() => document.body.innerText);

    console.log("Robô: 5. Extração concluída com sucesso.");
    return textoCompleto;

  } catch (error) {
    console.error(`Robô: Erro CRÍTICO no Puppeteer na URL ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
      console.log("Robô: 6. Navegador invisível fechado.");
    }
  }
}

// A função da IA continua a mesma que antes...
async function analisarTextoComIA(texto) {
  // (O código completo da função da IA que já temos)
  if (!texto || texto.length < 50) return [{ erro: "Conteúdo da página insuficiente para análise." }];
  try {
    console.log("Robô: Enviando texto para a IA do Gemini...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um especialista em analisar páginas de resultados de licitações públicas brasileiras. Analise o texto completo fornecido a seguir. Sua tarefa é encontrar TODAS as empresas que estão com o status "Desclassificada" ou "Inabilitada". Para cada uma dessas empresas, extraia as seguintes informações: 1. razaoSocial: O nome completo da empresa. 2. cnpj: O CNPJ da empresa. 3. motivoDaPerda: Se houver alguma informação sobre o motivo, resuma-a. Se não houver, retorne "Motivo não especificado na página". Retorne o resultado como um array de objetos JSON. Se nenhuma empresa desclassificada for encontrada, retorne um array vazio []. TEXTO PARA ANÁLISE: """ ${texto.substring(0, 30000)} """`;
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

// O Endpoint principal (sem grandes mudanças, apenas a chamada da nova função)
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise otimizado!");
  const pistas = req.body.pistas;

  if (!pistas || pistas.length === 0) {
    return res.status(400).json([{ message: "Nenhuma pista foi enviada." }]);
  }

  // Iremos analisar todas as pistas em sequência
  const resultadosFinais = [];
  for (const url of pistas) {
    const conteudoDaPagina = await buscarConteudoComPuppeteer(url);
    if (conteudoDaPagina) {
      const analiseIA = await analisarTextoComIA(conteudoDaPagina);
      if (analiseIA && !analiseIA.erro) {
        resultadosFinais.push(...analiseIA);
      }
    }
  }

  console.log(`Robô: Análise completa. Enviando ${resultadosFinais.length} resultados de volta.`);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão otimizada) rodando na porta ${PORT}`);
});