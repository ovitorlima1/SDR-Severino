export default async function handler(req, res) {
    // O Vercel coloca tudo o que vem depois de /kommo-api/ no parâmetro 'path' via vercel.json
    const { path, ...queryParams } = req.query;

    const token = process.env.VITE_KOMMO_TOKEN;
    const subdomain = process.env.VITE_KOMMO_SUBDOMAIN || 'billitecnologia';
    const apiDomain = process.env.VITE_KOMMO_API_DOMAIN || 'api-g.kommo.com';

    // Se não houver path, algo está errado na rota
    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }

    // Define o domínio base (prioriza subdomínio se configurado)
    const baseHost = subdomain ? `${subdomain}.kommo.com` : apiDomain;

    // Reconstrói a query string original
    const queryString = new URLSearchParams(queryParams).toString();
    const targetUrl = `https://${baseHost}/${path}${queryString ? '?' + queryString : ''}`;

    console.log(`Proxying to: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Severino-Proxy/1.0'
            },
            // Encaminha o corpo da requisição se não for GET/HEAD
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        // Caso de No Content
        if (response.status === 204) {
            return res.status(204).end();
        }

        const data = await response.json().catch(() => ({}));

        // Retorna os dados e o status original
        return res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({
            error: 'Internal Proxy Error',
            message: error.message
        });
    }
}
