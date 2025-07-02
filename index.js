// index.js - VERSÃO FINAL COM A LÓGICA DE EXCLUSÃO DO USUÁRIO

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: GEMINI_API_KEY não definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analisarBlocoHtmlComIA_Exclusao(blocoHtml) {
  try {
    console.log("Robô: Enviando bloco para IA com lógica de exclusão...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // ESTE É O NOVO PROMPT, BASEADO NA SUA IDEIA
    const prompt = `
      Analise o trecho de HTML a seguir de um portal de licitações. 
      Primeiro, identifique o status da empresa (ex: Adjudicada, Desclassificada, Homologado, etc.).
      Se o status for "Adjudicada", "Adjudicado", "Homologada", "Homologado", ou "Vencedor", retorne exatamente a palavra "null".
      Para QUALQUER OUTRO status (incluindo "Desclassificada", "Inabilitada", ou se não houver status visível), extraia a "razaoSocial" e o "cnpj" e retorne como um objeto JSON.
      TRECHO HTML: """${blocoHtml}"""
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoResposta = response.text().trim();

    if (textoResposta.toLowerCase() === 'null') {
      console.log("Robô: IA identificou um vencedor. Ignorando.");
      return null;
    }

    const dadosJson = JSON.parse(textoResposta.replace(/```json/g, '').replace(/```/g, ''));
    console.log("Robô: IA identificou um lead:", dadosJson.razaoSocial);
    return dadosJson;

  } catch (error) {
    console.error("Robô: Erro na análise com IA (Exclusão):", error);
    return null;
  }
}

// As funções de enriquecimento não mudam
async function buscarDadosCNPJ(cnpj) { /* ...código igual ao anterior... */ }
function validarFormatoTelefone(numero) { /* ...código igual ao anterior... */ }

// Recarregando as funções para não ter que rolar a tela
async function buscarDadosCNPJ(cnpj) {
    if (!cnpj) return null;
    try {
        const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) { return null; }
}
function validarFormatoTelefone(numero) {
    if (!numero) return "N/A";
    const n = String(numero).replace(/\D/g, '');
    return (n.length >= 10 && n.length <= 11) ? "Sim" : "Não";
}

// Endpoint principal
app.post('/analisar', async (req, res) => {
  const pista = req.body.pista;
  if (!pista || pista.tipo !== 'blocos_html' || !pista.dados || pista.dados.length === 0) {
    return res.status(200).json([]);
  }

  const blocosHtml = pista.dados;
  console.log(`Robô: Analisando ${blocosHtml.length} blocos com lógica de exclusão...`);

  const promessasDeEnriquecimento = blocosHtml.map(async (bloco) => {
    const dadosIniciais = await analisarBlocoHtmlComIA_Exclusão(bloco);

    if (!dadosIniciais || !dadosIniciais.cnpj) return null; // Ignora se for null ou não tiver CNPJ

    const dadosEmpresa = await buscarDadosCNPJ(dadosIniciais.cnpj);
    if (!dadosEmpresa) return { "Razão Social": dadosIniciais.razaoSocial, "CNPJ": dadosIniciais.cnpj, "Status": "Não Vencedor" };

    const socioAdmin = dadosEmpresa.qsa?.find(s => s.qualificacao_socio.includes('Administrador')) || dadosEmpresa.qsa?.[0];
    const nomeDecisor = socioAdmin ? socioAdmin.nome_socio : "Não encontrado";

    return {
      "Razão Social": dadosEmpresa.razao_social,
      "CNPJ": dadosEmpresa.cnpj,
      "Status": "Não Vencedor",
      "Decisor (Sócio)": nomeDecisor,
      "Busca Contato": socioAdmin ? `https://www.google.com/search?q=${encodeURIComponent(nomeDecisor)}+${encodeURIComponent(dadosEmpresa.razao_social)}+telefone+whatsapp` : "N/A",
      "Telefone Cadastrado": dadosEmpresa.ddd_telefone_1 || "N/A",
      "Formato Válido?": validarFormatoTelefone(dadosEmpresa.ddd_telefone_1),
      "UF": dadosEmpresa.uf,
    };
  });

  const resultadosFinais = (await Promise.all(promessasDeEnriquecimento)).filter(Boolean);

  console.log(`Robô: Enriquecimento completo. Enviando ${resultadosFinais.length} leads de volta.`);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (VERSÃO FINAL COM FILTRO DE EXCLUSÃO) rodando na porta ${PORT}`);
});