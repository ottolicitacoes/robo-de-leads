// index.js - Versão Final com Trava de Segurança

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- VERIFICAÇÃO DE SEGURANÇA ---
// Checa se a chave da API foi carregada do ambiente do Render.
// Se não foi, o programa para AGORA com uma mensagem de erro clara.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não foi definida!");
}
// --- FIM DA VERIFICAÇÃO ---

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// A inicialização da IA agora é segura, pois já verificamos a chave.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analisarTextoComIA(textoDaPagina) {
    // (O código desta função continua exatamente o mesmo de antes)
    if (!textoDaPagina || textoDaPagina.length < 50) return [{ erro: "Conteúdo da página insuficiente para análise." }];
    try {
        console.log("Robô: Enviando texto da página para análise da IA...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Você é um especialista em analisar páginas de resultados de licitações públicas brasileiras. Analise o texto completo fornecido a seguir. Sua tarefa é encontrar TODAS as empresas que estão com o status "Desclassificada" ou "Inabilitada". Para cada uma dessas empresas, extraia as seguintes informações: 1. razaoSocial: O nome completo da empresa. 2. cnpj: O CNPJ da empresa. 3. motivoDaPerda: Se houver alguma informação sobre o motivo, resuma-a. Se não houver, retorne "Motivo não especificado na página". Retorne o resultado como um array de objetos JSON. Se nenhuma empresa desclassificada for encontrada, retorne um array vazio []. TEXTO PARA ANÁLISE: """ ${textoDaPagina.substring(0, 30000)} """`;
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
    console.log("Robô: Recebeu um pedido de análise de página completa!");
    const textoDaPagina = req.body.textoDaPagina;
    if (!textoDaPagina) {
        return res.status(400).json([{ message: "Nenhum texto de página foi enviado." }]);
    }
    const analiseIA = await analisarTextoComIA(textoDaPagina);
    console.log("Robô: Análise completa. Enviando resultado de volta.");
    res.status(200).json(analiseIA);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor do robô (versão Super-Analista com trava de segurança) rodando na porta ${PORT}`);
});