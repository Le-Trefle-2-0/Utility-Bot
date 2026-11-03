function getLLMSettings(Client) {
    const llmSettings = Client.settings.llm || {};
    const legacyModel = Client.settings.groqModel;

    return {
        providerBaseUrl: llmSettings.providerBaseUrl || 'https://api.groq.com/openai/v1',
        primaryModel: llmSettings.primaryModel || legacyModel || null,
        fallbackModel: llmSettings.fallbackModel || null
    };
}

function getChatCompletionsUrl(providerBaseUrl) {
    return `${providerBaseUrl.replace(/\/+$/, '')}/chat/completions`;
}

function getAuthHeaders(apiKey) {
    return {
        'Authorization': ['Bearer', apiKey].join(' '),
        'Content-Type': 'application/json'
    };
}

async function testModel(providerBaseUrl, apiKey, model) {
    const response = await fetch(getChatCompletionsUrl(providerBaseUrl), {
        method: 'POST',
        headers: getAuthHeaders(apiKey),
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
            temperature: 0
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.choices?.[0]?.message) {
        throw new Error('Invalid completion response');
    }
}

async function initializeLLMProvider(Client) {
    const llmSettings = getLLMSettings(Client);
    const apiKey = process.env.GROQ_API_KEY;

    Client.llmProvider = {
        enabled: false,
        providerBaseUrl: llmSettings.providerBaseUrl,
        model: null,
        reason: null
    };

    if (!apiKey) {
        Client.llmProvider.reason = `Missing API key in env var GROQ_API_KEY`;
        Client.log?.warn?.(`[LLM] ${Client.llmProvider.reason}`);
        return;
    }

    if (!llmSettings.primaryModel) {
        Client.llmProvider.reason = 'Missing llm.primaryModel setting';
        Client.log?.warn?.(`[LLM] ${Client.llmProvider.reason}`);
        return;
    }

    try {
        await testModel(llmSettings.providerBaseUrl, apiKey, llmSettings.primaryModel);
        Client.llmProvider.enabled = true;
        Client.llmProvider.model = llmSettings.primaryModel;
        Client.log?.info?.(`[LLM] Using primary model: ${llmSettings.primaryModel}`);
        return;
    } catch (err) {
        Client.log?.warn?.(`[LLM] Primary model failed (${llmSettings.primaryModel}): ${err.message}`);
    }

    if (!llmSettings.fallbackModel) {
        Client.llmProvider.reason = 'Primary model failed and no fallback model is configured';
        Client.log?.warn?.(`[LLM] ${Client.llmProvider.reason}`);
        return;
    }

    try {
        await testModel(llmSettings.providerBaseUrl, apiKey, llmSettings.fallbackModel);
        Client.llmProvider.enabled = true;
        Client.llmProvider.model = llmSettings.fallbackModel;
        Client.log?.info?.(`[LLM] Using fallback model: ${llmSettings.fallbackModel}`);
    } catch (err) {
        Client.llmProvider.reason = `Primary and fallback models failed (${err.message})`;
        Client.log?.warn?.(`[LLM] ${Client.llmProvider.reason}`);
    }
}

async function createChatCompletion(Client, payload) {
    if (!Client.llmProvider?.enabled || !Client.llmProvider.model) {
        throw new Error(Client.llmProvider?.reason || 'LLM provider is disabled');
    }

    const llmSettings = getLLMSettings(Client);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error(`Missing API key in env var GROQ_API_KEY`);
    }

    const response = await fetch(getChatCompletionsUrl(Client.llmProvider.providerBaseUrl), {
        method: 'POST',
        headers: getAuthHeaders(apiKey),
        body: JSON.stringify({
            model: Client.llmProvider.model,
            ...payload
        })
    });

    if (!response.ok) {
        throw new Error(`LLM request failed with HTTP ${response.status}`);
    }

    return response.json();
}

module.exports = {
    createChatCompletion,
    initializeLLMProvider
};
