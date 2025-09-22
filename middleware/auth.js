const jwt = require('jsonwebtoken');

module.exports = function(headers) {
    const authHeader = headers.authorization;
    if (!authHeader) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Acesso negado. Nenhum token fornecido.' }) };
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded }; // Retorna o usuário decodificado em caso de sucesso
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { statusCode: 401, body: JSON.stringify({ message: 'Sua sessão expirou. Por favor, faça o login novamente.' }) };
        }
        return { statusCode: 401, body: JSON.stringify({ message: 'Token de autenticação inválido.' }) };
    }
};