// index.js - A VERSÃO FINAL E COMPLETA DO SUPER-ROBÔ

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não foi definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- NOSSAS NOVAS FUNÇÕES DE DETETIVE ---

// Função 1: Usa a IA para achar os CNPJs na página
async function extrairCNPJsComIA(textoDaPagina) {
  try {
    console.log("Robô: Usando IA para encontrar CNPJs...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise o texto a seguir e extraia TODOS os números de CNPJ únicos (formato XX.XXX.XXX/XXXX-XX) que você encontrar. Retorne apenas uma lista em formato JSON, como ["cnpj1", "cnpj2", ...]. Texto: """${textoDaPagina.substring(0, 30000)}"""`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textoJson);
  } catch (error) {
    console.error("Robô: Erro ao extrair CNPJs com IA:", error);
    return [];
  }
}

// Função 2: Busca os dados de um CNPJ em uma API pública
async function buscarDadosCNPJ(cnpj) {
  try {
    console.log(`Robô: Buscando dados para o CNPJ ${cnpj}...`);
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Robô: Erro ao buscar dados do CNPJ ${cnpj}:`, error.message);
    return null;
  }
}

// Função 3: Valida o formato de um telefone
function validarFormatoTelefone(numero) {
    if (!numero) return "Não";
    const numeroLimpo = String(numero).replace(/\D/g, '');
    // Verifica se tem 10 (fixo) ou 11 (celular) dígitos
    if (numeroLimpo.length >= 10 && numeroLimpo.length <= 11) {
        return "Sim";
    }
    return "Não";
}

// --- O ENDEREÇO PRINCIPAL DO ROBÔ (AGORA ORQUESTRANDO TUDO) ---
app.post('/analisar', async (req, res) => {
  console.log("Robô: Recebeu um pedido de análise e enriquecimento completo!");
  const textoDaPagina = req.body.textoDaPagina;

  if (!textoDaPagina) {
    return res.status(400).json([]);
  }

  // Etapa 1: Usar a IA para extrair todos os CNPJs da página
  const cnpjsEncontrados = await extrairCNPJsComIA(textoDaPagina);

  if (!cnpjsEncontrados || cnpjsEncontrados.length === 0) {
    return res.status(200).json([]);
  }

  console.log(`Robô: IA encontrou ${cnpjsEncontrados.length} CNPJs. Iniciando enriquecimento...`);

  // Etapa 2: Para cada CNPJ, buscar as informações em paralelo
  const promessasDeEnriquecimento = cnpjsEncontrados.map(async (cnpj) => {
    const dadosEmpresa = await buscarDadosCNPJ(cnpj);
    if (!dadosEmpresa) return null;

    // Etapa 3: Identificar o decisor (sócio administrador)
    const socioAdmin = dadosEmpresa.qsa?.find(socio => socio.qualificacao_socio.includes('Administrador')) || dadosEmpresa.qsa?.[0];
    const nomeDecisor = socioAdmin ? socioAdmin.nome_socio : "N/A";

    // Etapa 4: Montar o link de busca pelo contato
    const buscaGoogle = `https://www.google.com/search?q=${encodeURIComponent(nomeDecisor)}+${encodeURIComponent(dadosEmpresa.razao_social)}+telefone`;

    return {
      "CNPJ": dadosEmpresa.cnpj,
      "Razao Social": dadosEmpresa.razao_social,
      "Atividade Principal": dadosEmpresa.cnae_fiscal_descricao,
      "Decisor (Sócio)": nomeDecisor,
      "Telefone 1": dadosEmpresa.ddd_telefone_1,
      "Telefone 1 Válido?": validarFormatoTelefone(dadosEmpresa.ddd_telefone_1),
      "Busca Contato": buscaGoogle,
      "UF": dadosEmpresa.uf,
    };
  });

  // Espera todas as buscas terminarem
  const resultadosFinais = (await Promise.all(promessasDeEnriquecimento)).filter(Boolean); // filter(Boolean) remove os nulos

  console.log(`Robô: Enriquecimento completo. Enviando ${resultadosFinais.length} leads de volta.`);
  res.status(200).json(resultadosFinais);
});

// --- LIGANDO O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão GRAND FINALE) rodando na porta ${PORT}`);
});