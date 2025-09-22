// Arquivo: netlify/functions/webhook.js

require('dotenv').config();
const mongoose = require('mongoose');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
const Order = require('../../models/Order');

// A função de email precisa estar aqui para ser usada quando um pagamento for aprovado.
async function sendDeliveryEmail(user, products, totalAmount) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const productListHTML = products.map(p => 
        `<li><strong>${p.name}:</strong> <a href="${p.deliveryContent}">Acessar Produto</a></li>`
    ).join('');

    await transporter.sendMail({
        from: `"Sua Loja - ZeroDay" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `✅ Seus produtos da Loja ZeroDay foram entregues!`,
        html: `
            <h1>Olá, ${user.name}!</h1>
            <p>Seu pagamento de R$ ${totalAmount.toFixed(2).replace('.', ',')} foi aprovado com sucesso.</p>
            <p>Aqui estão os seus produtos:</p>
            <ul>
                ${productListHTML}
            </ul>
            <p>Obrigado por comprar conosco!</p>
        `
    });
}

// Função para reutilizar a conexão com o banco de dados
let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        }).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    // Esta função só deve aceitar requisições POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        await connectToDatabase();
        const notification = JSON.parse(event.body);

        // Verificamos se a notificação é do tipo 'payment'
        if (notification.type === 'payment') {
            const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
            const payment = new Payment(client);
            
            // Usamos o ID da notificação para buscar os detalhes completos do pagamento
            const paymentDetails = await payment.get({ id: notification.data.id });
            
            // Encontramos o nosso pedido no banco de dados usando a 'preference_id' que o Mercado Pago nos retorna
            const order = await Order.findOne({ paymentId: paymentDetails.preference_id }).populate('user').populate('products');

            // Se encontrarmos o pedido, ele estiver pendente e o pagamento foi aprovado...
            if (order && order.status === 'pending' && paymentDetails.status === 'approved') {
                // ...atualizamos o status para 'completed', salvamos e enviamos o email de entrega.
                order.status = 'completed';
                await order.save();
                await sendDeliveryEmail(order.user, order.products, order.totalAmount);
            }
        }
    } catch (error) {
        console.error("Erro no webhook:", error);
        // Mesmo que ocorra um erro interno, nós informamos ao Mercado Pago que recebemos a notificação.
        // Isso evita que eles fiquem tentando enviar a mesma notificação repetidamente.
    }
    
    // É crucial sempre retornar um status 200 para o Mercado Pago
    return { statusCode: 200, body: 'Webhook recebido.' };
};