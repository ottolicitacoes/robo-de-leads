const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURAÇÃO ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNÇÕES DE AJUDA ---

// Função para visitar uma página, clicar em tudo e extrair o texto
async function buscarConteudoComPuppeteer(url) {
  console.log(`Robô: Abrindo navegador invisível para visitar: ${url}`);
  let browser = null;
  try {
    // Configurações especiais para o Puppeteer rodar no ambiente do Render.com
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      headless: true // Roda sem interface gráfica
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Espera a página carregar

    console.log("Robô: Página carregada. Tentando expandir todos os elementos clicáveis...");

    // Tenta clicar em elementos que parecem ser expansíveis para revelar conteúdo
    await page.evaluate(() => {
      const selectors = 'button, a, span, div[role="button"]';
      document.querySelectorAll(selectors).forEach(element => {
        // Clica em elementos que tenham palavras como "detalhes", "propostas", etc.
        if (element.innerText.toLowerCase().match(/detalhes|propostas|expandir|ver|ata|documento/)) {
          element.click();
        }
      });
    });

    // Espera um pouco para o conteúdo aparecer após os cliques
    await new Promise(r => setTimeout(r, 2000)); 

    console.log("Robô: Extraindo texto da página completa...");
    const textoCompleto = await page.evaluate(() => document.body.innerText);

    return textoCompleto;
  } catch (error) {
    console.error(`Robô: Erro ao usar o Puppeteer na URL ${url}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close(); // Garante que o navegador invisível seja sempre fechado
      console.log("Robô: Navegador invisível fechado.");
    }
  }
}

// Função da IA (sem alterações)
async function analisarTextoComIA(texto) {
  // ... (código da função da IA que já tínhamos) ...
  // ... (para economizar espaço, não vou colar de novo, mas ela continua aqui) ...
   if (!texto || texto.length < 50) {
    return [{ erro: "Conteúdo da página insuficiente para análise." }];
  }
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

// --- O ENDEREÇO PRINCIPAL DO ROBÔ ---
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise com Puppeteer e IA!");
  const pistas = req.body.pistas;

  if (!pistas || pistas.length === 0) {
    return res.status(400).json([{ message: "Nenhuma pista foi enviada." }]);
  }

  const resultadosFinais = [];

  // Agora, vamos analisar TODAS as pistas, não apenas a primeira
  for (const url of pistas) {
    const conteudoDaPagina = await buscarConteudoComPuppeteer(url);
    if (conteudoDaPagina) {
      const analiseIA = await analisarTextoComIA(conteudoDaPagina);
      // Adiciona a URL de origem ao resultado para sabermos de onde veio
      if (Array.isArray(analiseIA)) {
         analiseIA.forEach(item => item.fonte = url);
         resultadosFinais.push(...analiseIA);
      }
    }
  }

  console.log(`Robô: Análise completa. Enviando ${resultadosFinais.length} resultados de volta.`);
  res.status(200).json(resultadosFinais);
});

// --- LIGANDO O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão com Puppeteer) rodando na porta ${PORT}`);
});