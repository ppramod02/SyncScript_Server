const dotenv = require("dotenv");
const { PasteClient, Publicity } = require("pastebin-api");
const router = require("express").Router();
dotenv.config();

const client = new PasteClient(process.env.PASTEBIN_API_KEY);

router.get('/', (req, res, next) => {
	res.send({ message: 'Need some id to get paste' });
})

router.get('/:id', async (req, res, next) => {
	const pasteKey = req.params.id;
	const token = await client.login({ name: process.env.PASTEBIN_USERNAME, password: process.env.PASTEBIN_PASSWORD });
	if(token) {
		try {
			const rawPaste = await client.getRawPasteByKey({
				userKey: token,
				pasteKey,
			});
			const pastes = await client.getPastesByUser({
				userKey: token,
			});
			
			const paste = pastes.filter(p => p.paste_key === pasteKey); 
			if(paste.length === 0) {
				return res.status(200).send({ success: false, paste: {} });
			}
			
			const data = { paste_text: rawPaste, paste_format: paste[0].paste_format_short };
			return res.status(200).send({ success: true, paste: data });
		} catch (error) {
			console.log(error);
		}
	}
});

router.post('/', async (req, res, next) => {
	const { code, format } = req.body;
	const token = await client.login({ name: process.env.PASTEBIN_USERNAME, password: process.env.PASTEBIN_PASSWORD });
	if(token) {
		try {
			const url = await client.createPaste({
				code: code,
				expireDate: '1H',
				format: format,
				name: "syncscript-code",
				publicity: Publicity.Public,
				apiUserKey: token,
			});
			res.status(200).send({ url });
		} catch (error) {
			console.log(error);
		}
	}
});

module.exports = router;


