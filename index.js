const express = require('express');
const cors =require('cors');
const axios = require('axios');
const pdf = require('pdf-parse'); // Nossa nova ferramenta de PDF
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não foi definida!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNÇÕES DE AJUDA ---

// Função para extrair texto de qualquer URL (HTML ou PDF)
async function extrairTextoDaUrl(url) {
  try {
    console.log(`Robô: Investigando a URL: ${url}`);
    // Baixa o conteúdo da URL como um "buffer" de dados brutos
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = response.data;

    // Verifica se é um PDF pela "assinatura" do arquivo ou pela URL
    if (url.toLowerCase().includes('.pdf') || Buffer.isBuffer(buffer) && buffer.slice(0, 4).toString() === '%PDF') {
      console.log("Robô: Detectado um arquivo PDF. Extraindo texto...");
      const data = await pdf(buffer);
      return data.text;
    } else {
      // Se não for PDF, trata como HTML
      console.log("Robô: Detectada uma página HTML. Extraindo texto...");
      // O Buffer de HTML precisa ser convertido para texto
      const htmlText = buffer.toString('utf-8');
      // Aqui poderíamos usar o Puppeteer ou Cheerio se necessário,
      // mas para simplificar, vamos enviar o HTML bruto para a IA.
      // A IA moderna consegue extrair o texto relevante do HTML.
      return htmlText;
    }
  } catch (error) {
    console.error(`Robô: Erro ao processar a URL ${url}:`, error.message);
    return null;
  }
}

// Função da IA (sem alterações, ela apenas recebe texto)
async function analisarTextoComIA(texto) {
  // ... (O código desta função continua o mesmo) ...
  if (!texto || texto.length < 20) return null;
  try {
    console.log("Robô: Enviando texto extraído para a IA...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um especialista em analisar documentos de licitações públicas. O texto a seguir foi extraído de uma página HTML ou de um documento PDF. Sua tarefa é encontrar TODAS as empresas que estão com o status "Desclassificada" ou "Inabilitada". Para cada empresa, extraia: 1. razaoSocial, 2. cnpj, 3. motivoDaPerda (resumido). Retorne um array de objetos JSON. Se não encontrar nada, retorne um array vazio []. TEXTO: """ ${texto.substring(0, 50000)} """`;
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
  console.log("Robô: Recebeu um pedido de análise polivalente!");
  const pistas = req.body.pistas; // Agora ele espera uma lista de URLs

  if (!pistas || !Array.isArray(pistas) || pistas.length === 0) {
    return res.status(400).json([]);
  }

  const resultadosFinais = [];
  for (const url of pistas) {
    const textoExtraido = await extrairTextoDaUrl(url);
    if (textoExtraido) {
      const analiseIA = await analisarTextoComIA(textoExtraido);
      if (analiseIA && Array.isArray(analiseIA)) {
         // Adiciona a URL de origem ao resultado para sabermos de onde veio
         analiseIA.forEach(item => item.fonte = url);
         resultadosFinais.push(...analiseIA);
      }
    }
  }

  console.log(`Robô: Análise completa. Enviando ${resultadosFinais.length} resultados.`);
  res.status(200).json(resultadosFinais);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do robô (versão Polivalente com Leitor de PDF) rodando na porta ${PORT}`);
});