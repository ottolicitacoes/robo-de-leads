// index.js - O Esqueleto do nosso Super-Robô

// 1. Importando as ferramentas que instalamos
const express = require('express');
const cors = require('cors');

// 2. Criando o "chassi" do nosso servidor
const app = express();

// 3. Configurando as permissões de acesso e o formato de dados
app.use(cors());
app.use(express.json()); // Permite que o servidor entenda o formato JSON

// 4. Definindo a "porta" onde nosso robô vai atender
const PORT = process.env.PORT || 3000;

// 5. Este é o "endereço" principal que a extensão vai chamar: /analisar
app.post('/analisar', (req, res) => {
    console.log("Robô recebeu um pedido de análise!");

    // Pega as "pistas" (a lista de links) que a extensão pode ter enviado
    const pistas = req.body.pistas;
    console.log("Pistas recebidas:", pistas);

    // --- LÓGICA DE ANÁLISE (SERÁ ADICIONADA AQUI DEPOIS) ---
    // Por enquanto, vamos apenas responder que recebemos o pedido e
    // devolver uma tabela de exemplo para podermos testar a conexão.

    const tabelaDeExemplo = [
        {
            razaoSocial: "Empresa Teste 1 Ltda",
            cnpj: "11.111.111/0001-11",
            motivoDaPerda: "Resposta simulada do robô. A conexão funcionou!",
            objetoDaLicitacao: "Serviços de Teste",
            orgaoLicitante: "Prefeitura Exemplo"
        },
        {
            razaoSocial: "Comércio de Exemplo 2 SA",
            cnpj: "22.222.222/0001-22",
            motivoDaPerda: "Apenas um exemplo de resposta.",
            objetoDaLicitacao: "Produtos de Teste",
            orgaoLicitante: "Governo Exemplo"
        }
    ];

    // O robô devolve a tabela de exemplo como resposta
    res.status(200).json(tabelaDeExemplo);
});

// 6. "Ligando" o robô para que ele comece a ouvir por pedidos
app.listen(PORT, () => {
  console.log(`Servidor do robô rodando na porta ${PORT}`);
});