M
My Workspace
robo-de-leads
Menu

Search
Ctrl+
K

New

Upgrade


o
Dashboard
robo-de-leads
Events
Settings
Monitor
Logs
Metrics
Manage
Environment
Shell
Scaling
Previews
Disks
Jobs

Changelog
Invite a friend

Contact support
Render Status
Web Service
robo-de-leads
Node
Free
Upgrade your instance

Connect

Manual Deploy
ottolicitacoes / robo-de-leads
main
https://robo-de-leads.onrender.com

Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more.
Upgrade now

All logs
Search
Search

Live tail
GMT-4

Menu

     ==> Deploying...
==> Running 'node index.js'
Servidor do robô (versão Super-Analista com trava de segurança) rodando na porta 10000
     ==> Your service is live 🎉
     ==> 
     ==> ///////////////////////////////////////////////////////////
     ==> 
     ==> Available at your primary URL https://robo-de-leads.onrender.com
     ==> 
     ==> ///////////////////////////////////////////////////////////
Robô: Recebeu um pedido de análise de página completa!
Robô: Enviando texto da página para análise da IA...
Robô: Erro ao analisar com a IA: TypeError: Headers.append: "curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: GEMINI_API_KEY' \
  -X POST \
  -d '{
    "contents": [
      {
Robô: Análise completa. Enviando resultado de volta.
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'" is an invalid header value.
    at webidl.errors.exception (node:internal/deps/undici/undici:3610:14)
    at webidl.errors.invalidArgument (node:internal/deps/undici/undici:3621:28)
    at appendHeader (node:internal/deps/undici/undici:8652:29)
    at _Headers.append (node:internal/deps/undici/undici:8862:16)
    at getHeaders (/opt/render/project/src/node_modules/@google/generative-ai/dist/index.js:358:13)
    at constructModelRequest (/opt/render/project/src/node_modules/@google/generative-ai/dist/index.js:385:124)
    at makeModelRequest (/opt/render/project/src/node_modules/@google/generative-ai/dist/index.js:391:41)
    at generateContent (/opt/render/project/src/node_modules/@google/generative-ai/dist/index.js:867:28)
    at GenerativeModel.generateContent (/opt/render/project/src/node_modules/@google/generative-ai/dist/index.js:1377:16)
    at analisarTextoComIA (/opt/render/project/src/index.js:29:36)
     ==> Detected service running on port 10000
     ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
     ==> Deploying...
==> Running 'node index.js'
Servidor do robô (versão Super-Analista com trava de segurança) rodando na porta 10000
     ==> Your service is live 🎉
     ==> 
     ==> ///////////////////////////////////////////////////////////
     ==> 
     ==> Available at your primary URL https://robo-de-leads.onrender.com
     ==> 
     ==> ///////////////////////////////////////////////////////////
Robô: Recebeu um pedido de análise de página completa!
Robô: Enviando texto da página para análise da IA...
Robô: Análise da IA concluída.
Robô: Análise completa. Enviando resultado de volta.
Robô: Recebeu um pedido de análise de página completa!
Robô: Enviando texto da página para análise da IA...
Robô: Análise da IA concluída.
Robô: Análise completa. Enviando resultado de volta.
Need better ways to work with logs? Try theRender CLIor set up a log stream integration 

0 services selected:

Move

Generate Blueprint

