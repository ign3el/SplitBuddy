// Minimal index function to validate serverless routing
export default function handler(req, res) {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({ ok: true, message: 'index function alive' }));
}
