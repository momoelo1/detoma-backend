const cloudinary = require("cloudinary").v2;
const { scontorna, decodifica, giaScontornata, motoreAttivo } = require("./scontorno");

// Configures itself automatically from process.env.CLOUDINARY_URL
// (the single connection string shown on the Cloudinary dashboard).

// base64 data URIs start with "data:image/..."; anything else (an
// already-uploaded Cloudinary URL, or empty) is passed through untouched.
const isBase64Image = (value) => typeof value === "string" && value.startsWith("data:image");

// Con `scontorna: true` (vini, distillati e birre) la foto grezza viene caricata,
// passata a utils/scontorno.js e sostituita dalla versione pulita: sul
// documento resta l'URL di quest'ultima, la grezza viene cancellata. Se il
// motore fallisce — rete, crediti finiti, foto strana — si tiene la grezza e
// si scrive un rigo di log: il salvataggio del negozio non deve mai saltare
// per colpa dello scontorno. L'unica eccezione è il tetto ai crediti, qui
// sotto: lì il salvataggio viene rifiutato apposta, PRIMA di caricare.
//
// La foto pulita arriva da utils/scontorno.js già codificata in **webp** —
// il formato che il negozio usa per le sue foto, con il canale alpha — e
// viene caricata così com'è.
const FORMATO_PULITA = "webp";

// Tetto ai crediti dello scontorno.
//
// Il piano gratuito di Cloudinary ha 25 crediti su una finestra MOBILE di 30
// giorni: non si azzera a inizio mese, ogni giorno esce il consumo di 31
// giorni prima. (Dopo il blocco il supporto ne ha aggiunti 12, ma solo fino
// al 9 novembre 2026: vedi LIMITE_MAX più sotto.) Superarli non costa soldi, costa di peggio: Cloudinary
// DISATTIVA l'account, e con lui tutte le foto del sito — successo il
// 2026-10-10. Il grosso lo fa lo scontorno: ogni `e_background_removal` conta
// 75 trasformazioni, cioè 0,075 crediti (dal resoconto d'uso del 2026-10-12:
// 487 scontorni = 36,5 dei 41,3 crediti della finestra); tutto il resto del
// negozio ne consuma circa 5.
//
// Quindi, prima di caricare foto che andrebbero scontornate, si guarda il
// consumo, e vicino al tetto si RIFIUTA il salvataggio intero: nessuna foto
// caricata, nemmeno la grezza al posto della pulita — scelta del titolare. Il
// pannello mostra il messaggio (vedi `errorHandler` in utils/middleware.js); il
// resto del prodotto si salva togliendo la foto nuova.
//
// `usage()` da solo non basta: Cloudinary lo aggiorna una volta al giorno
// (`last_updated` è la data di ieri), e il 2026-10-08 gli scontorni sono stati
// 49 in un giorno solo. Per questo la foto pulita viene caricata col tag
// `scontornata`, e al resoconto si sommano quelle caricate da `last_updated`
// in poi, contate con la Search API. Il giorno di `last_updated` può finire
// contato due volte: l'errore sta dalla parte prudente.
//
// Con Pixelcut acceso lo scontorno non tocca i crediti di Cloudinary, e il
// controllo non serve.
const SOGLIA_CREDITI = 0.9; // la stessa a cui Cloudinary manda il primo avviso

// Il tetto si calcola su 25 anche quando Cloudinary dice di più (2026-10-16).
// I 12 crediti in più del supporto (37 in tutto) valgono solo fino al 9
// novembre, mentre ogni scontorno resta nella finestra per 30 giorni:
// contando su 37, la guardia lascerebbe salire il consumo oltre 25 proprio
// prima che il limite torni lì, e da quel giorno l'account sarebbe di nuovo
// oltre il limite — cioè disattivato, foto del sito comprese. Se un giorno il
// limite vero fosse più basso di 25, vale quello.
const LIMITE_MAX = 25;
const CREDITI_PER_SCONTORNO = 0.075;
const TAG_SCONTORNATA = "scontornata";

const MESSAGGIO_LIMITE =
  "Per qualche giorno non si possono caricare nuove foto di bottiglie: il limite gratuito per togliere gli sfondi è quasi finito. Il resto del prodotto si può salvare togliendo la foto nuova.";
const MESSAGGIO_CONTROLLO =
  "In questo momento non riesco a controllare il limite delle foto. Riprova tra qualche minuto.";

// l'errorHandler lo riconosce dal nome, come i CastError di Mongoose
const erroreCrediti = (messaggio) => Object.assign(new Error(messaggio), { name: "CreditiFotoError" });

// Quante delle foto nuove passeranno davvero dal motore. Si decide QUI, sul
// base64 arrivato dal pannello e prima di caricare qualunque cosa, con la
// stessa regola che `scontorna` applica dopo: le foto già scontornate non
// costano niente e non devono essere bloccate. Una alla volta, non in
// parallelo: una foto da fotocamera decodificata pesa decine di MB.
const quanteDaScontornare = async (elenco) => {
  let n = 0;
  for (const img of elenco.filter(isBase64Image)) {
    const buf = Buffer.from(img.slice(img.indexOf(",") + 1), "base64");
    if (!giaScontornata(await decodifica(buf))) n++;
  }
  return n;
};

const controllaCrediti = async (elenco, { scontorna: daScontornare = false } = {}) => {
  if (!daScontornare || motoreAttivo() !== "cloudinary") return;
  const nuove = await quanteDaScontornare(elenco);
  if (nuove === 0) return;

  // Se il controllo stesso fallisce (rete, account già disattivato) non si
  // carica: senza il numero non si può sapere se si è sotto il tetto.
  let usati, tetto;
  try {
    const { credits, last_updated: aggiornato } = await cloudinary.api.usage();
    const { total_count: recenti } = await cloudinary.search
      .expression(`tags=${TAG_SCONTORNATA} AND uploaded_at>=${aggiornato}`)
      .max_results(1)
      .execute();
    usati = credits.usage + recenti * CREDITI_PER_SCONTORNO;
    tetto = Math.min(credits.limit, LIMITE_MAX) * SOGLIA_CREDITI;
  } catch (err) {
    console.error(`controllo crediti fallito (${err.message || err.error?.message})`);
    throw erroreCrediti(MESSAGGIO_CONTROLLO);
  }
  if (!(usati + nuove * CREDITI_PER_SCONTORNO <= tetto)) {
    console.error(
      `crediti: ${usati.toFixed(2)} usati + ${nuove} scontorni oltre il tetto di ${tetto.toFixed(2)}: caricamento rifiutato`
    );
    throw erroreCrediti(MESSAGGIO_LIMITE);
  }
};

const caricaUna = async (img, folder, { scontorna: daScontornare = false } = {}) => {
  if (!isBase64Image(img)) return img;
  const grezza = await cloudinary.uploader.upload(img, { folder });
  if (!daScontornare) return grezza.secure_url;
  try {
    const webp = await scontorna(grezza.secure_url);
    if (!webp) return grezza.secure_url; // arrivata già scontornata
    const pulita = await cloudinary.uploader.upload(
      `data:image/${FORMATO_PULITA};base64,${webp.toString("base64")}`,
      { folder, tags: [TAG_SCONTORNATA] }
    );
    await cloudinary.uploader.destroy(grezza.public_id);
    return pulita.secure_url;
  } catch (err) {
    console.error(`scontorno fallito (${err.message}): tengo la foto com'è`);
    return grezza.secure_url;
  }
};

// Il controllo dei crediti sta qui e in `uploadImages`, una volta per
// richiesta e PRIMA di qualunque caricamento: se blocca, su Cloudinary non
// resta niente e in archivio non si salva niente.
const uploadImage = async (img, folder, opzioni = {}) => {
  await controllaCrediti([img], opzioni);
  return caricaUna(img, folder, opzioni);
};

// Più foto per prodotto (i vini, da 2026-09-09: `img` è un array).
//
// Accetta indifferentemente un array o la stringa singola di prima — il corpo
// che arriva dal pannello admin oggi è ancora una stringa sola, e Mongoose la
// avvolgerebbe comunque — e torna SEMPRE un array. I valori vuoti si buttano
// qui: erano loro a lasciare in archivio il famigerato [""], cioè "una foto"
// che foto non è (vedi il commento su `img` in models/Wine.js).
//
// In parallelo e non in fila: ogni foto nuova costa un caricamento più, per i
// vini, una chiamata allo scontorno, cioè secondi. Tre foto in fila sarebbero
// tre volte l'attesa e su Vercel il salvataggio rischierebbe il timeout della
// funzione; in parallelo l'attesa resta quella della più lenta. Le foto già
// caricate (URL Cloudinary) non fanno nessuna chiamata: `caricaUna` le
// restituisce com'erano, quindi risalvare un vino non ricarica niente.
const uploadImages = async (img, folder, opzioni = {}) => {
  const elenco = (Array.isArray(img) ? img : [img]).filter(Boolean);
  await controllaCrediti(elenco, opzioni);
  return Promise.all(elenco.map((una) => caricaUna(una, folder, opzioni)));
};

// ricava il public_id (es. "enoteca-detoma/wines/abc123") da un secure_url
// tipo https://res.cloudinary.com/<cloud>/image/upload/v169.../<public_id>.<ext>
const getPublicId = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return match ? match[1] : null;
};

// elimina l'asset da Cloudinary in modo permanente. Se `img` non è un URL
// Cloudinary reale (vuoto, o mai caricato) non fa nulla — non c'è nulla da
// cancellare lato storage, solo il riferimento nel documento va svuotato.
// Accetta anche un array: cancella tutte le foto che contiene.
const deleteImage = async (img) => {
  if (Array.isArray(img)) {
    await Promise.all(img.map(deleteImage));
    return;
  }
  if (typeof img !== "string" || !img.includes("res.cloudinary.com")) return;
  const publicId = getPublicId(img);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadImages,
  deleteImage,
  isBase64Image,
  FORMATO_PULITA,
};
