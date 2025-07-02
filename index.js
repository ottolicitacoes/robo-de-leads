// index.js - VERSÃO DE LANÇAMENTO FINAL

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURAÇÃO ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: GEMINI_API_KEY não definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNÇÕES DO DETETIVE ---

// Função 1: Usa o Puppeteer para visitar a página de detalhes e extrair o texto completo
async function extrairTextoDaPaginaDeDetalhes(url) {
  console.log(`Robô: Abrindo navegador para extrair texto de: ${url}`);
  let browser = null;
  try {
    const launchOptions = { args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote'] };
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const textoCompleto = await page.evaluate(() => document.body.innerText);
    return textoCompleto;
  } catch (error) {
    console.error(`Robô: Erro no Puppeteer para a URL ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// Função 2: Usa a IA para encontrar os dados da licitação no texto
async function analisarTextoComIA(texto) {
  if (!texto || texto.length < 20) return [];
  try {
    console.log("Robô: Enviando texto para IA para análise da licitação...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise o texto a seguir, extraído de uma página de detalhes de licitação. Sua tarefa é encontrar a empresa com status "Desclassificada" ou "Inabilitada" e extrair as seguintes informações: razaoSocial, cnpj, motivoDaPerda (resumido), objetoDaLicitacao (resumido), orgaoLicitante, modalidade, e numeroDoProcesso. Retorne um array com um único objeto JSON contendo estes dados. Se não encontrar, retorne um array vazio []. TEXTO: """${texto}"""`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Robô: Erro ao analisar com a IA:", error);
    return [];
  }
}

// Função 3: Usa uma API pública para enriquecer os dados do CNPJ
async function buscarDadosCNPJ(cnpj) {
  if (!cnpj) return null;
  try {
    console.log(`Robô: Buscando dados para o CNPJ ${cnpj}...`);
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    return null;
  }
}

// Função 4: Valida o formato de um telefone
function validarFormatoTelefone(numero) {
    if (!numero) return "N/A";
    const numeroLimpo = String(numero).replace(/\D/g, '');
    return (numeroLimpo.length >= 10 && numeroLimpo.length <= 11) ? "Sim" : "Não";
}

// --- ENDPOINT PRINCIPAL ---
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise final!");
  // A extensão agora envia a URL da página de detalhes que está aberta
  const urlDaPagina = req.body.urlDaPagina;

  if (!urlDaPagina) {
    return res.status(400).json([]);
  }

  // Etapa 1: Extrair o texto da página com Puppeteer
  const textoDaPagina = await extrairTextoDaPaginaDeDetalhes(urlDaPagina);
  if (!textoDaPagina) {
    return res.status(200).json([]);
  }

  // Etapa 2: Usar a IA para extrair os dados básicos da licitação
  const dadosDaLicitacao = await analisarTextoComIA(textoDaPagina);
  if (dadosDaLicitacao.length === 0) {
    return res.status(200).json([]);
  }

  const lead = dadosDaLicitacao[0];

  // Etapa 3: Enriquecer com dados da empresa e do decisor
  const dadosEmpresa = await buscarDadosCNPJ(lead.cnpj);
  let leadFinal = { ...lead };

  if (dadosEmpresa) {
    const socioAdmin = dadosEmpresa.qsa?.find(s => s.qualificacao_socio.includes('Administrador')) || dadosEmpresa.qsa?.[0];
    const nomeDecisor = socioAdmin ? socioAdmin.nome_socio : "Não encontrado";

    leadFinal = {
      "Razão Social": dadosEmpresa.razao_social,
      "CNPJ": dadosEmpresa.cnpj,
      "Status": "Desclassificada/Inabilitada",
      "Motivo (IA)": lead.motivoDaPerda,
      "Objeto (IA)": lead.objetoDaLicitacao,
      "Órgão Licitante": lead.orgaoLicitante,
      "Decisor (Sócio)": nomeDecisor,
      "Contato (Busca)": `https://www.google.com/search?q=${encodeURIComponent(nomeDecisor)}+${encodeURIComponent(dadosEmpresa.razao_social)}+telefone+whatsapp`,
      "Telefone Cadastrado": dadosEmpresa.ddd_telefone_1 || "N/A",
      "Formato Válido?": validarFormatoTelefone(dadosEmpresa.ddd_telefone_1)
    };
  }

  console.log("Robô: Enriquecimento completo. Enviando lead final.");
  res.status(200).json([leadFinal]); // Retorna sempre um array
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (VERSÃO FINAL DE LANÇAMENTO) rodando na porta ${PORT}`);
});