/******** Chargement des Middleware ********/

const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const pgClient = require('pg');
const crypto = require('crypto');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const mongoClient = require('mongodb').MongoClient;
const mongoObjectId = require('mongodb').ObjectId;
const { isSet } = require('./helpers');
const { isEqual, isEmpty } = require('underscore');

const app = new express();

const http = require('http').Server(app);
const io = require('socket.io')(http);




/******** Declaration des variables ********/

const mongoUri = 'mongodb://127.0.0.1:27017/db';
const pgOptions = {
	user: 'uapv1800823',
	host: 'pedago02a.univ-avignon.fr',
	database: 'etd',
	password: '5TPfnQ',
	port: 5432
};






/******** Configuration du serveur NodeJS - Port : 3xxx ********/

http.listen(3204);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(__dirname + '/CERIGame'));
app.use(session({
	secret: '1dcca23355272056f04fe8bf20edfce0',
	saveUninitialized: false,
	resave: false,
	store: new mongoDBStore({
		uri: mongoUri,
		collection: 'mySessions3204',
		touchAfter: 24 * 3600
	}),
	cookie: { maxAge: 24 * 3600 * 1000 }
}))





/******** Socket.io ********/

io.on('connection', socket => {

	socket.on('connected-users', () => {

		let oldData = [];

		setInterval(async () => {


			const pool = new pgClient.Pool(pgOptions);
			const client = await pool.connect();

			try {

				const data = await client.query(`
					SELECT id, nom, prenom, identifiant, avatar FROM fredouil.users WHERE statut = 1`
				);

				if (!isEqual(oldData, data.rows)) {
					oldData = data.rows;
					socket.emit('connected-users-response', { users: data.rows });
				}


			} catch (error) {
				console.log('Impossible de récupérer les utilisateurs connectés');
				console.log(error);

				socket.emit('connected-users-response', { users: null, error });

			} finally {
				client.release();
			}


		}, 2000);


	})




	socket.on('top-ten', () => {

		let oldData = [];

		setInterval(async () => {

			const pool = new pgClient.Pool(pgOptions);

			const client = await pool.connect();

			try {

				const data = await client.query(`
					SELECT * FROM fredouil.historique
					LEFT JOIN fredouil.users
					ON fredouil.historique.id_users = fredouil.users.id
					ORDER BY score DESC
					LIMIT 10`
				);

				if (!isEqual(oldData, data.rows)) {
					oldData = data.rows;
					socket.emit('top-ten-response', { users: data.rows });
				}

			} catch (error) {
				console.log('Impossible de récupérer le top ten');
				console.log(error);

				socket.emit('top-ten-response', { users: null, error });

			} finally {
				client.release();
			}


		}, 2000);

	})




	socket.on('defi', async (args) => {

		let oldData = [];

		const cli = await mongoClient.connect(mongoUri);

		setInterval(async () => {

			const data = await cli.db().collection('defi').find({ userDefiee: args }).toArray();

			if (!isEqual(oldData, data)) {
				oldData = data;

				if (!isEmpty(data))
					socket.emit('defi-response', { defi: data });
			}


		}, 2000)


	})



})






/******** Gestion des URI ********/

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'CERIGame/index.html'));
});

app.get('/login', async (req, res) => {

	if (req.session.isConnected)
		return res.status(401).send('Déjà connecté');

	const { login, password } = req.query;

	if (!login || !password)
		return res.status(400).send('Login ou mot de passe manquant');

	req.session.login = login;
	req.session.isConnected = false;

	const pool = new pgClient.Pool(pgOptions);
	const client = await pool.connect();

	try {

		let sha1 = crypto.createHash('sha1').update(password).digest('hex');

		let ret = await client.query(`
			SELECT * FROM fredouil.users WHERE identifiant = $1 AND motpasse = $2`
			, [login, sha1]
		);

		if (!ret.rowCount)
			return res.status(400).send('Aucun utilisateur ne correspond.');


		let { id, identifiant, nom, prenom, avatar } = ret.rows[0];

		req.session.uid = id;
		req.session.isConnected = true;

		ret = await client.query(`
			SELECT date, nbreponse, temps, score FROM fredouil.historique WHERE id_users = $1`
			, [id]
		);

		let historique = ret.rows;

		await client.query(`
			UPDATE fredouil.users SET statut = 1 WHERE id = $1`
			, [id]
		);

		// Récupération des défis de l'utilisateur.
		const cli = await mongoClient.connect(mongoUri);
		const defis = await cli.db().collection('defi').find({ userDefiee: req.session.uid.toString() }).toArray();


		// Médailles

		ret = await client.query(`
			SELECT *,
				CASE
					WHEN id_users_defiant = $1 THEN (SELECT identifiant FROM fredouil.users WHERE id = id_users_defie)
					ELSE (SELECT identifiant FROM fredouil.users WHERE id = id_users_defiant)
				END
			FROM fredouil.hist_defi where id_users_gagnant = $2`
			, [req.session.uid, req.session.uid]
		);

		let medailles = ret.rows;

		if (defis.length)
			res.status(200).json({ id, identifiant, nom, prenom, avatar, historique, medailles, defis });

		else
			res.status(200).json({ id, identifiant, nom, prenom, avatar, historique, medailles });

	} catch (error) {
		console.log('Connexion impossible');
		console.log(error);

		return res.sendStatus(500);

	} finally {
		client.release();
	}



});


app.get('/logout', async (req, res) => {

	const pool = new pgClient.Pool(pgOptions);
	const client = await pool.connect();

	await client.query(`
		UPDATE fredouil.users SET statut = 0 WHERE id = $1`
		, [req.session.uid]
	);

	client.release();

	req.session.destroy();

	return res.sendStatus(200);
})



app.post('/profile', async (req, res) => {
	const { nom, prenom, identifiant } = req.body;

	if (!nom || !prenom || !identifiant)
		return res.sendStatus(400);

	const pool = new pgClient.Pool(pgOptions);

	const client = await pool.connect();

	try {

		await client.query(`
			UPDATE fredouil.users SET nom = $1, prenom = $2, identifiant = $3 WHERE id = $4`
			, [nom, prenom, identifiant, req.session.uid]
		);

		return res.status(201).send();

	} catch (error) {
		console.log('Impossible de mettre-à-jour le profil');
		console.log(error);

		return res.status(500).send();

	} finally {
		client.release();
	}

})

app.post('/profile/image', async (req, res) => {
	const { base64, ext } = req.body;

	if (!base64 || !ext)
		return res.sendStatus(400);

	const buff = new Buffer(base64, 'base64');
	const name = crypto.randomBytes(12).toString('hex');

	await fs.writeFile(`/home/nas02a/etudiants/inf/uapv1800823/public_html/CERIGame/${name}.${ext}`, buff);

	const pool = new pgClient.Pool(pgOptions);

	const client = await pool.connect();

	try {

		const url = `https://pedago02a.univ-avignon.fr/~uapv1800823/CERIGame/${name}.${ext}`;

		await client.query(`
			UPDATE fredouil.users SET avatar = $1 WHERE id = $2`
			, [url, req.session.uid]
		);

		return res.status(201).json({ url })

	} catch (error) {
		console.log('Impossible de mettre-à-jour le profil');
		console.log(error);

		return res.status(500).send();

	} finally {
		client.release();
	}

})


app.get('/quizz', async (req, res) => {
	const { theme } = req.query;

	if (!theme)
		return res.status(400).send('Thème manquant.');

	const cli = await mongoClient.connect(mongoUri);

	try {

		const data = await cli.db().collection('quizz').find({ thème: theme }, { quizz: 1 }).toArray();

		return res.status(200).json({ quizz: data[0].quizz });

	} catch (error) {
		console.log('Impossible de récupérer les quizz.');
		console.log(error)

		return res.sendStatus(500);

	} finally {
		cli.close()
	}


})

app.post('/quizz', async (req, res) => {
	const { score, nbReponse, temps } = req.body;

	if (!isSet(score) || !isSet(nbReponse) || !isSet(temps))
		return res.status(400).send('Score manquant');

	const pool = new pgClient.Pool(pgOptions);

	const client = await pool.connect();

	try {

		await client.query(`
			INSERT INTO fredouil.historique (id_users, date, nbreponse, temps, score)
			VALUES ($1, $2, $3, $4, $5)`
			, [req.session.uid, new Date(), nbReponse, temps, score]
		);

		const ret = await client.query(`
			SELECT date, nbreponse, temps, score FROM fredouil.historique WHERE id_users = $1`,
			[req.session.uid]
		)

		return res.status(201).json({ historique: ret.rows });

	} catch (error) {
		console.log('Impossible d\'insérer le quizz');
		console.log(error);

		return res.status(500).send();

	} finally {
		client.release();
	}
})


app.get('/users', async (req, res) => {

	const pool = new pgClient.Pool(pgOptions);

	const client = await pool.connect();

	try {

		const ret = await client.query(`
			SELECT id, nom, prenom, identifiant, avatar FROM fredouil.users`
		);

		return res.status(201).json({ users: ret.rows });

	} catch (error) {
		console.log('Impossible de récupérer les utilisateurs connectés');
		console.log(error);

		return res.status(500).send();

	} finally {
		client.release();
	}

})


app.post('/defi', async (req, res) => {

	if (!req.body)
		return res.status(400).send('Paramètres manquants');

	const cli = await mongoClient.connect(mongoUri);

	try {

		await cli.db().collection('defi').insertOne(req.body)

		return res.sendStatus(201);

	} catch (error) {
		console.log('Impossible de d\'insérer le défi.');
		console.log(error)

		return res.sendStatus(500);

	} finally {
		cli.close()
	}

})

app.post('/defi/result', async (req, res) => {

	const { _id, idUserDefiant, idUserDefiee, idUserGagnant } = req.body;

	if (!_id)
		return res.status(400).send('Paramètres manquants');

	const cli = await mongoClient.connect(mongoUri);
	const pool = new pgClient.Pool(pgOptions);
	const client = await pool.connect();

	try {

		// Ajout de la medaille au gagnant
		await client.query(`
			INSERT INTO fredouil.hist_defi (id_users_defiant, id_users_defie, id_users_gagnant, date)
			VALUES ($1, $2, $3, $4)`,
			[idUserDefiant, idUserDefiee, idUserGagnant, new Date()]
		)

		await cli.db().collection('defi').deleteOne({ _id: new mongoObjectId(_id) });

		// Retourner le nouveau tableau de medailles
		const ret = await client.query(`
			SELECT *,
				CASE
					WHEN id_users_defiant = $1 THEN (SELECT identifiant FROM fredouil.users WHERE id = id_users_defie)
					ELSE (SELECT identifiant FROM fredouil.users WHERE id = id_users_defiant)
				END
			FROM fredouil.hist_defi where id_users_gagnant = $2`
			, [req.session.uid, req.session.uid]
		);

		return res.status(200).json({ medailles: ret.rows });

	} catch (error) {
		console.log('Impossible de d\'insérer le défi.');
		console.log(error)

		return res.sendStatus(500);

	} finally {
		cli.close();
		client.release();
	}


})