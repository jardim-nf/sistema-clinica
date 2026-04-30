const axios = require('axios');
const admin = require('firebase-admin');
const OpenAI = require('openai');

// Ensure Firebase admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Environment variables
const UAZAPI_URL = process.env.UAZAPI_URL || 'https://meunumero.uazapi.com';
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN || 'SEU_TOKEN_AQUI';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'SUA_CHAVE_OPENAI';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Enviar texto no WhatsApp
async function sendText(phone, message) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) return;
    try {
        const resp = await axios.post(
            `${UAZAPI_URL}/send/text`,
            { number: phone, text: message },
            { headers: { 'Content-Type': 'application/json', 'token': UAZAPI_TOKEN } }
        );
        console.log('✅ Mensagem enviada com sucesso para', phone);
    } catch (e) {
        console.error('Erro ao enviar mensagem Uazapi:', e.response?.data || e.message);
    }
}

// Prompt do ChatGPT
function getSystemPrompt() {
    const hoje = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    return `Você é a assistente virtual da clínica IdeaSaúde. Seja extremamente educada, empática e prestativa. Hoje é: ${hoje}.

## Seu papel principal: Atuar como Secretária Completa
- Pergunte qual a especialidade médica que o paciente procura.
- Pergunte por uma preferência de data e **use a ferramenta "obter_horarios_disponiveis"** para fornecer a ele opções reais de horários livres não agendados.
- Se o paciente escolher um horário, **use a ferramenta "agendar_consulta"** para concluir. Jamais confirme um agendamento para o usuário sem antes executar essa ferramenta com sucesso.
- Peça o nome completo do paciente educadamente, se não possuir.

## REGRAS DE ATENDIMENTO
1. Não ofereça sábados ou domingos.
2. Não atenda emergências médicas.
3. Não fale sobre medicações ou dê diagnósticos médicos.
4. Se o paciente responder a um lembrete confirmando (ex: "1", "sim", "confirmo") ou cancelando (ex: "2", "não", "cancelar"), use a ferramenta "confirmar_ou_cancelar_consulta" para atualizar o status.
5. Se o paciente disser palavras como "falar com pessoa", "humano", "atendente", retorne apenas a palavra exata [ESCALAR_HUMANO].
6. Respostas curtas, fáceis de ler, e simpáticas via WhatsApp. Max 2 parágrafos. Emojis com moderação.`;
}

// Definição das Ferramentas
const tools = [
    {
        type: "function",
        function: {
            name: "obter_horarios_disponiveis",
            description: "Consulta no sistema os horários vazios em uma data específica. Útil para dar opções reais ao paciente.",
            parameters: {
                type: "object",
                properties: {
                    data: { type: "string", description: "Data da busca no formato AAAA-MM-DD. Ex: 2026-10-25" }
                },
                required: ["data"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "agendar_consulta",
            description: "Agenda fisicamente a consulta no sistema após o paciente escolher uma data e hora vazia que você passou pra ele.",
            parameters: {
                type: "object",
                properties: {
                    data: { type: "string", description: "Data no formato AAAA-MM-DD" },
                    hora: { type: "string", description: "Hora no formato HH:mm" },
                    nomePaciente: { type: "string", description: "Nome e sobrenome do paciente" },
                    especialidade: { type: "string", description: "A especialidade do médico (ex: Clinico, Pediatria)" }
                },
                required: ["data", "hora", "nomePaciente", "especialidade"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "confirmar_ou_cancelar_consulta",
            description: "Atualiza o status de uma consulta existente do paciente (buscada pelo número de WhatsApp) para CONFIRMADO ou CANCELADO. Use quando o paciente responder a um lembrete confirmando ou cancelando.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["confirmado", "cancelado"], description: "A ação escolhida pelo paciente." }
                },
                required: ["acao"]
            }
        }
    }
];

// Implementação Lógica Interna das Ferramentas
async function executeTool(name, args, phone) {
    if (name === 'obter_horarios_disponiveis') {
        const dataBuscada = args.data; // AAAA-MM-DD
        const dateObj = new Date(`${dataBuscada}T00:00:00-03:00`);
        
        if (isNaN(dateObj.getTime())) return JSON.stringify({ erro: "Data mal formatada." });
        const diaSemana = dateObj.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            return JSON.stringify({ 
                erro: "Indisponível. A clínica só atende de Seg-Sex das 08:00 às 18:00. Peça ao paciente outro dia."
            });
        }

        // Criar Grade de 30 em 30 minutos
        let todosHorarios = [];
        for (let h = 8; h < 18; h++) {
            let prefix = h.toString().padStart(2, '0');
            todosHorarios.push(`${prefix}:00`);
            todosHorarios.push(`${prefix}:30`);
        }

        // Buscar Agendados do banco de dados na mesma "data"
        const snapshot = await db.collection('agendamentos').where('data', '==', dataBuscada).get();
        const horariosOcupados = snapshot.docs.map(doc => doc.data().hora);

        // Remover os ocupados
        const disponiveis = todosHorarios.filter(h => !horariosOcupados.includes(h));

        return JSON.stringify({
            dataPesquisada: dataBuscada,
            horariosLivres: disponiveis.length > 0 ? disponiveis : "Não há vagas para este dia."
        });
    }

    if (name === 'agendar_consulta') {
        try {
            await db.collection('agendamentos').add({
                telefone: phone,
                nomePaciente: args.nomePaciente,
                data: args.data,
                hora: args.hora,
                especialidade: args.especialidade,
                origem: 'WHATSAPP_IA',
                status: 'CONFIRMADO', // Salva já oficial
                dataCriacao: admin.firestore.FieldValue.serverTimestamp()
            });
            return JSON.stringify({ sucesso: true, avisoAoBot: "A consulta foi gravada com segurança no banco. Confirme com o paciente!" });
        } catch (e) {
            return JSON.stringify({ erro: "Erro de permissão no banco ao agendar." });
        }
    }

    if (name === 'confirmar_ou_cancelar_consulta') {
        try {
            // Busca a consulta mais recente do paciente que ainda está pendente ou agendada
            const snapshot = await db.collection('agendamentos')
                .where('telefone', '==', phone)
                .where('status', 'in', ['agendado', 'pendente'])
                .get();

            if (snapshot.empty) {
                return JSON.stringify({ erro: "Não encontrei nenhuma consulta agendada para confirmar ou cancelar neste número." });
            }

            // Pega a mais próxima caso haja mais de uma
            let consultas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            consultas.sort((a, b) => new Date(`${a.data}T${a.hora || '00:00'}`) - new Date(`${b.data}T${b.hora || '00:00'}`));
            
            const consultaAlvo = consultas[0];
            
            await db.collection('agendamentos').doc(consultaAlvo.id).update({
                status: args.acao,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return JSON.stringify({ sucesso: true, avisoAoBot: `A consulta foi marcada como ${args.acao}. Agradeça/informe ao paciente.` });
        } catch (e) {
            console.error("Erro na ferramenta confirmar_ou_cancelar_consulta:", e);
            return JSON.stringify({ erro: "Erro ao atualizar consulta no banco." });
        }
    }

    return JSON.stringify({ erro: "Função desconhecida" });
}


exports.handleWebhookGet = (req, res) => {
    res.status(200).send('Webhook Uazapi online');
};

exports.handleWebhookPost = async (req, res) => {
    res.json({ status: 'ok' }); // Retorno rápido para a Uazapi
    
    try {
        console.log('📥 PAYLOAD COMPLETO:', JSON.stringify(req.body));
        console.log('📥 CHAVES DO BODY:', Object.keys(req.body));
        const body = req.body;

        // ================================================================
        // PARSER UNIVERSAL UAZAPI — 4 formatos (copiado do PontoCerto/MataFome)
        // ================================================================
        let telefone = '';
        let text = '';
        let fromMe = false;
        let isAutoResponse = false;
        let pushName = 'Paciente';

        if (body.BaseUrl || body.EventType) {
            // 🟢 FORMATO A — meunumero.uazapi.com (formato principal)
            const msgArr = body.messages || (body.message ? [body.message] : []);
            const msg = msgArr[0] || body.message || {};

            telefone = msg?.key?.remoteJid
                || msg?.remoteJid
                || msg?.chatid
                || body?.phone
                || body?.sender
                || body?.from
                || body?.chat?.phone
                || body?.chat?.wa_chatid
                || '';

            text = msg?.message?.conversation
                || msg?.message?.extendedTextMessage?.text
                || msg?.text || msg?.body
                || body?.text || body?.body || body?.content || '';

            fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? body?.message?.fromMe ?? body?.fromMe ?? false;
            isAutoResponse = (msg?.wasSentByApi === true || body?.message?.wasSentByApi === true);
            pushName = body?.chat?.wa_contactName || body?.chat?.name || body?.pushName || msg?.senderName || 'Paciente';

            console.log('📍 FORMATO A (BaseUrl/EventType) detectado');

        } else if (body?.event === 'messages.upsert' || body?.data?.key) {
            // 🟡 FORMATO B — evento messages.upsert com wrapper data
            const msgData = body.data || {};

            telefone = msgData?.key?.remoteJid || '';
            text = msgData?.message?.conversation
                || msgData?.message?.extendedTextMessage?.text || '';
            fromMe = msgData?.key?.fromMe || false;
            pushName = body?.pushName || body?.data?.pushName || 'Paciente';

            console.log('📍 FORMATO B (data.key / messages.upsert) detectado');

        } else if (body?.key?.remoteJid) {
            // 🔵 FORMATO C — Baileys legado direto
            telefone = body.key.remoteJid;
            text = body?.message?.conversation
                || body?.message?.extendedTextMessage?.text || '';
            fromMe = body.key.fromMe || false;
            pushName = body?.pushName || 'Paciente';

            console.log('📍 FORMATO C (key.remoteJid legado) detectado');

        } else {
            // ⚪ FORMATO DESCONHECIDO — tenta extrair qualquer coisa
            telefone = body?.from || body?.phone || body?.number || body?.sender || '';
            text = body?.text || body?.message || body?.body || body?.msg || '';
            fromMe = body?.fromMe === true;
            pushName = body?.pushName || 'Paciente';

            console.log('📍 FORMATO DESCONHECIDO — tentando fallback');
        }

        // Limpar telefone: remover @s.whatsapp.net, @c.us, @lid, e caracteres não numéricos
        telefone = String(telefone).replace(/@[\w.]+/g, '').replace(/[^0-9]/g, '');
        text = String(text || '').trim();
        let from = telefone;

        // Garantir formato do telefone para envio (com 55)
        if (from && !from.startsWith('55')) {
            from = `55${from}`;
        }

        // Ignorar grupos
        const isGroup = String(body?.message?.chatid || body?.key?.remoteJid || '').includes('@g.us')
            || body?.message?.isGroup === true
            || body?.chat?.wa_isGroup === true;

        console.log(`📊 PARSED: fromMe=${fromMe}, isAuto=${isAutoResponse}, telefone=${telefone}, texto="${text.substring(0, 50)}"`);

        if (fromMe || isAutoResponse) {
            console.log('⏭️ IGNORADO: fromMe ou autoResponse');
            return;
        }
        if (isGroup) {
            console.log('⏭️ IGNORADO: mensagem de grupo');
            return;
        }
        if (!text) {
            console.log('⏭️ IGNORADO: sem texto');
            return;
        }

        const sessionRef = db.collection('whatsapp_sessions').doc(from);
        const sessionSnap = await sessionRef.get();
        let sessionData = sessionSnap.exists ? sessionSnap.data() : { history: [], handoff: false };

        if (sessionData.handoff) {
            if (text.toLowerCase().includes('reiniciar')) {
                await sessionRef.set({ history: [], handoff: false });
                await sendText(from, '✅ Meu modo automático foi reativado. Como posso te apoiar agora?');
            }
            return;
        }

        let messages = [
            { role: 'system', content: getSystemPrompt() },
            ...(sessionData.history || [])
        ];
        
        messages.push({ role: 'user', content: `[${pushName}]: ${text}` });

        // Limita o escopo (mantendo apenas ~12 últimas mensagens)
        if (messages.length > 15) messages = [messages[0], ...messages.slice(-14)];

        // Loop de chamada da IA para suportar Tool Calls
        let gptResponse = null;
        let isMakingToolCalls = true;

        while (isMakingToolCalls) {
            gptResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                tools: tools,
                temperature: 0.7,
            });

            const choice = gptResponse.choices[0];
            
            // Se o chatbot escolheu "usar uma ferramenta"
            if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls) {
                // Anexa a decisão de chamar tool ao array original senão a API rejeita o proximo call
                messages.push(choice.message);

                for (const toolCall of choice.message.tool_calls) {
                    const funcName = toolCall.function.name;
                    const funcArgs = JSON.parse(toolCall.function.arguments);
                    
                    const funcResult = await executeTool(funcName, funcArgs, from);
                    
                    // Anexar o resultado da devolução da ferramenta na linha do tempo
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: funcResult
                    });
                }
                // O loop reinicia e submete a mensagem de devolução novamente pra OpenAI pensar
            } else {
                // Resposta Mero Texto (Terminou a inferência lógica)
                isMakingToolCalls = false;
            }
        }

        let botReply = gptResponse.choices[0]?.message?.content || 'Desculpe, tive uma pequena falha na rede de conectividade.';

        // Lógica HandOff do Prompt
        if (botReply.includes('[ESCALAR_HUMANO]')) {
            await sendText(from, '👩🏻‍💻 Um momento, por favor. Vou te transferir para nossa recepção agora! (Se quiser voltar a falar comigo em modo inteligente, basta digitar "reiniciar").');
            await sessionRef.set({ ...sessionData, handoff: true });

            await db.collection('notificacoes').add({
                tipo: 'ATENDIMENTO_WHATSAPP',
                telefone: from,
                nome: pushName,
                mensagem: 'Paciente solicitou atendimento humano (IA transferiu via [ESCALAR_HUMANO]).',
                lida: false,
                dataCriacao: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        // Devolve ao Whatsapp
        messages.push({ role: 'assistant', content: botReply });
        await sendText(from, botReply);
        
        // Remove a instrução do system antes de guardar no banco
        await sessionRef.set({ history: messages.slice(1), handoff: false });
        
    } catch (error) {
        console.error('Erro na integração OpenAI/Uazapi:', error.message);
    }
};
