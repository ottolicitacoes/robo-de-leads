// index.js - A VERSÃO FINAL, SIMPLES E ROBUSTA

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: GEMINI_API_KEY não definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// As funções de enriquecimento continuam as mesmas
async function buscarDadosCNPJ(cnpj) { /* ...código da função igual ao anterior... */ 
    if (!cnpj) return null;
    try {
        const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) { return null; }
}
function validarFormatoTelefone(numero) { /* ...código da função igual ao anterior... */
    if (!numero) return "N/A";
    const n = String(numero).replace(/\D/g, '');
    return (n.length >= 10 && n.length <= 11) ? "Sim" : "Não";
}

// A função da IA que recebe o texto completo
async function analisarTextoComIA(texto) {
  if (!texto || texto.length < 20) return [];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um especialista em analisar textos de páginas de licitações. No texto a seguir, encontre TODAS as empresas com status "Desclassificada" ou "Inabilitada". Para cada uma, extraia: 1. razaoSocial, 2. cnpj (se houver), 3. motivoDaPerda (resumido), 4. objetoDaLicitacao (resumido), 5. orgaoLicitante, 6. modalidade, 7. numeroDoProcesso. Retorne um array de objetos JSON. Se não encontrar nada, retorne um array vazio []. TEXTO: """ ${texto} """`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textoJson);
  } catch (error) {
    return [{ erro: `Falha na análise da IA.` }];
  }
}

// Endpoint principal: recebe o texto e orquestra as análises
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise de texto.");
  const textoDaPagina = req.body.textoDaPagina;

  if (!textoDaPagina) return res.status(400).json([]);

  const leadsIniciais = await analisarTextoComIA(textoDaPagina);
  if (leadsIniciais.length === 0) return res.status(200).json([]);

  console.log(`Robô: IA encontrou ${leadsIniciais.length} leads iniciais. Enriquecendo...`);

  const promessasDeEnriquecimento = leadsIniciais.map(async (lead) => {
    const dadosEmpresa = await buscarDadosCNPJ(lead.cnpj);
    if (!dadosEmpresa) return lead; // Retorna o lead básico se não encontrar dados do CNPJ

    const socioAdmin = dadosEmpresa.qsa?.find(s => s.qualificacao_socio.includes('Administrador')) || dadosEmpresa.qsa?.[0];
    return {
      "Razão Social": dadosEmpresa.razao_social || lead.razaoSocial,
      "CNPJ": dadosEmpresa.cnpj || lead.cnpj,
      "Status": "Desclassificada/Inabilitada",
      "Motivo (IA)": lead.motivoDaPerda,
      "Objeto (IA)": lead.objetoDaLicitacao,
      "Órgão Licitante": lead.orgaoLicitante,
      "Decisor (Sócio)": socioAdmin ? socioAdmin.nome_socio : "N/A",
      "Contato (Busca)": socioAdmin ? `https://www.google.com/search?q=${encodeURIComponent(socioAdmin.nome_socio)}+${encodeURIComponent(dadosEmpresa.razao_social)}+telefone` : "N/A",
      "Telefone Cadastrado": dadosEmpresa.ddd_telefone_1 || "N/A",
      "Formato Válido?": validarFormatoTelefone(dadosEmpresa.ddd_telefone_1)
    };
  });

  const resultadosFinais = await Promise.all(promessasDeEnriquecimento);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (VERSÃO FINAL ROBUSTA) rodando na porta ${PORT}`);
});