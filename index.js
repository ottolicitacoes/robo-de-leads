// index.js - VERSÃO FINAL DE LANÇAMENTO

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

// Função da IA, agora otimizada para analisar pequenos blocos de HTML
async function analisarBlocoHtmlComIA(blocoHtml) {
  try {
    console.log("Robô: Enviando bloco HTML para a IA...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um especialista em analisar trechos de HTML de portais de licitação. No trecho de HTML a seguir, encontre a empresa e extraia as seguintes informações: 1. razaoSocial, 2. cnpj, 3. status (Ex: Desclassificada, Adjudicada, etc.). Retorne um único objeto JSON. Se não encontrar os dados, retorne null. TRECHO HTML: """${blocoHtml}"""`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Robô: Erro ao analisar bloco com a IA:", error);
    return null;
  }
}

// As outras funções de enriquecimento continuam as mesmas
async function buscarDadosCNPJ(cnpj) { /* ...código igual ao anterior... */ 
    if (!cnpj) return null;
    try {
        const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) { return null; }
}
function validarFormatoTelefone(numero) { /* ...código igual ao anterior... */
    if (!numero) return "N/A";
    const n = String(numero).replace(/\D/g, '');
    return (n.length >= 10 && n.length <= 11) ? "Sim" : "Não";
}

// Endpoint principal: agora ele recebe os blocos de HTML
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido com blocos de HTML!");
  const pista = req.body.pista;

  if (!pista || pista.tipo !== 'blocos_html' || !pista.dados || pista.dados.length === 0) {
    return res.status(200).json([]);
  }

  const blocosHtml = pista.dados;
  console.log(`Robô: Analisando ${blocosHtml.length} blocos de HTML...`);

  const promessasDeEnriquecimento = blocosHtml.map(async (bloco) => {
    const dadosIniciais = await analisarBlocoHtmlComIA(bloco);

    // Só continua se a IA encontrou uma empresa e ela está desclassificada
    if (!dadosIniciais || !dadosIniciais.status || !dadosIniciais.status.toLowerCase().includes('desclassificada')) {
      return null;
    }

    const dadosEmpresa = await buscarDadosCNPJ(dadosIniciais.cnpj);
    if (!dadosEmpresa) return { "Razão Social": dadosIniciais.razaoSocial, "CNPJ": dadosIniciais.cnpj, "Status": dadosIniciais.status };

    const socioAdmin = dadosEmpresa.qsa?.find(s => s.qualificacao_socio.includes('Administrador')) || dadosEmpresa.qsa?.[0];
    const nomeDecisor = socioAdmin ? socioAdmin.nome_socio : "Não encontrado";

    return {
      "Razão Social": dadosEmpresa.razao_social,
      "CNPJ": dadosEmpresa.cnpj,
      "Status": dadosIniciais.status,
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
  console.log(`Servidor do robô (VERSÃO FINALÍSSIMA) rodando na porta ${PORT}`);
});