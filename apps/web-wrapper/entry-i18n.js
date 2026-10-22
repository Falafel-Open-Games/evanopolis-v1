/*
  Translations for the player-facing entry pages.

  English source text is the key: t("Connect wallet") returns the text for
  the current language and falls back to English when a translation is
  missing. Values use {name} placeholders filled from the params object.
  Language codes match the game client: en, es, and pt_br.

  The current language comes from the ?language= parameter, then the stored
  choice, then the browser language, then English. setEntryLanguage() stores
  a new choice and dispatches EntryLanguageChangeEvent on document so the
  page scripts can re-render.
*/
const EntryLanguageChangeEvent = "entry-language-change";
const EntryLanguageStorageKey = "evanopolis.entry.language";
const EntryLanguages = {
  en: { code: "EN", htmlLang: "en" },
  es: { code: "ES", htmlLang: "es" },
  pt_br: { code: "PT", htmlLang: "pt-BR" },
};

let currentEntryLanguage = resolveEntryLanguage();

function entryLanguage() {
  return currentEntryLanguage;
}

function t(source, params = {}) {
  const translations = EntryTranslations[currentEntryLanguage];
  const text = translations?.[source] ?? source;
  return text.replace(/\{(\w+)\}/g, (placeholder, name) => (name in params ? String(params[name]) : placeholder));
}

function setEntryLanguage(language) {
  if (!(language in EntryLanguages) || language === currentEntryLanguage) {
    return;
  }

  currentEntryLanguage = language;
  try {
    window.localStorage.setItem(EntryLanguageStorageKey, language);
  } catch {
    // Without storage the choice still applies to this page view.
  }
  // A ?language= value outranks the stored choice, so keep it in step.
  const url = new URL(window.location.href);
  if (url.searchParams.has("language")) {
    url.searchParams.set("language", language);
    window.history.replaceState(null, "", url);
  }
  document.dispatchEvent(new Event(EntryLanguageChangeEvent));
}

function resolveEntryLanguage() {
  const requested = normalizedEntryLanguage(new URLSearchParams(window.location.search).get("language"));
  if (requested !== null) {
    return requested;
  }

  try {
    const stored = normalizedEntryLanguage(window.localStorage.getItem(EntryLanguageStorageKey));
    if (stored !== null) {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }

  return normalizedEntryLanguage(globalThis.navigator?.language) ?? "en";
}

// Accepts game codes (pt_br) and browser tags (pt-BR, es-419, en-US).
function normalizedEntryLanguage(value) {
  if (typeof value !== "string") {
    return null;
  }

  const tag = value.trim().toLowerCase();
  if (tag.startsWith("pt")) {
    return "pt_br";
  }
  if (tag.startsWith("es")) {
    return "es";
  }
  if (tag.startsWith("en")) {
    return "en";
  }
  return null;
}

const EntryTranslations = {
  es: {
    // Page titles and landmarks
    "Evanopolis · Create a game": "Evanopolis · Crear partida",
    "Evanopolis · Free game": "Evanopolis · Partida gratis",
    "Room entry flow": "Flujo de entrada a la sala",
    "Free game entry flow": "Flujo de entrada a la partida gratis",
    "Legal": "Legal",
    "Language": "Idioma",
    "Open menu": "Abrir menú",
    "Switch to dark theme": "Cambiar a tema oscuro",
    "Switch to light theme": "Cambiar a tema claro",

    // Header and footer
    "Wallet": "Billetera",
    "Not connected": "No conectada",
    "Balance": "Saldo",
    "Buy EVA": "Comprar EVA",
    "© 2026 EverValue Ecosystem. All rights reserved.": "© 2026 EverValue Ecosystem. Todos los derechos reservados.",
    "Privacy policy": "Política de privacidad",
    "Terms of service": "Términos del servicio",

    // Hero
    "New room": "Nueva sala",
    "Room open": "Sala abierta",
    "Invitation": "Invitación",
    "Free game": "Partida gratis",
    "Create a game": "Crea una partida",
    "Choose how many players and what the ticket costs. We open the room and give you a link to invite them — the game starts once everyone has joined.": "Elige cuántos jugadores y cuánto cuesta la entrada. Abrimos la sala y te damos un enlace para invitarlos: la partida empieza cuando todos se hayan unido.",
    "Your room is open": "Tu sala está abierta",
    "Send the link to your players. Each one pays their own ticket, and the board opens as soon as every seat is paid.": "Envía el enlace a tus jugadores. Cada uno paga su propia entrada, y el tablero se abre en cuanto todos los asientos estén pagados.",
    "You’re invited": "Estás invitado",
    "{host} saved you a seat in a paid game of Evanopolis. Connect your wallet, pay your ticket, and the board opens once every seat is paid.": "{host} te guardó un asiento en una partida paga de Evanopolis. Conecta tu billetera, paga tu entrada y el tablero se abre cuando todos los asientos estén pagados.",
    "Someone": "Alguien",
    "No wallet?": "¿Sin billetera?",
    "Play a free game instead": "Juega una partida gratis",
    "Create a free game": "Crea una partida gratis",
    "No wallet and no ticket. Choose how many players, share the link, and play the full board — same rules, nothing at stake.": "Sin billetera y sin entrada. Elige cuántos jugadores, comparte el enlace y juega el tablero completo: las mismas reglas, sin nada en juego.",
    "Your free game is ready": "Tu partida gratis está lista",
    "Send the link to your players. Anyone with it takes a seat — no wallet, no sign-up. You can enter the board and wait for them there.": "Envía el enlace a tus jugadores. Quien lo tenga ocupa un asiento, sin billetera ni registro. Puedes entrar al tablero y esperarlos ahí.",
    "Someone saved you a seat in a free game of Evanopolis. No wallet, no ticket, no account — take the seat and the board opens.": "Alguien te guardó un asiento en una partida gratis de Evanopolis. Sin billetera, sin entrada, sin cuenta: ocupa el asiento y el tablero se abre.",
    "Have EVA?": "¿Tienes EVA?",
    "Play for a ticket instead": "Juega con entrada",

    // Steps
    "Connect your wallet": "Conecta tu billetera",
    "Your wallet is how the game knows the seat is yours. You’ll sign a short message to log in — a signature proves who you are, it never moves EVA. The ticket is paid later, in its own step.": "Tu billetera es la forma en que el juego sabe que el asiento es tuyo. Firmarás un mensaje corto para iniciar sesión: una firma demuestra quién eres y nunca mueve EVA. La entrada se paga después, en su propio paso.",
    "Connect wallet": "Conectar billetera",
    "Wallet connected": "Billetera conectada",
    "Change": "Cambiar",
    "Set up your game": "Configura tu partida",
    "Review this game": "Revisa esta partida",
    "Your name, how many seats, and what the ticket costs.": "Tu nombre, cuántos asientos y cuánto cuesta la entrada.",
    "Your display name": "Tu nombre visible",
    "Your name": "Tu nombre",
    "Number of players": "Número de jugadores",
    "Ticket per player": "Entrada por jugador",
    "Cheap": "Económica",
    "Average": "Media",
    "Deluxe": "Deluxe",
    "Or set your own amount": "O elige tu propio monto",
    "e.g. 2.5": "ej. 2.5",
    "From 0.01 to 1000 EVA, up to 2 decimals.": "De 0.01 a 1000 EVA, hasta 2 decimales.",
    "Enter a ticket from 0.01 to 1000 EVA, up to 2 decimals.": "Ingresa una entrada de 0.01 a 1000 EVA, con hasta 2 decimales.",
    "Game set up": "Partida configurada",
    "Invitation loaded": "Invitación cargada",
    "Edit": "Editar",
    "Start over": "Empezar de nuevo",
    "{game} · {count} players · {price}": "{game} · {count} jugadores · {price}",
    "Paid game": "Partida paga",
    "Free game · ": "Partida gratis · ",
    " players · 1 seat taken": " jugadores · 1 asiento ocupado",
    " players · Free": " jugadores · Gratis",
    "Pay your ticket": "Paga tu entrada",
    "{price}, once the room is open. Your wallet may ask twice: first to allow EVA, then to pay.": "{price}, cuando la sala esté abierta. Tu billetera puede pedirlo dos veces: primero para autorizar EVA y luego para pagar.",
    "Your seat is held by the wallet that pays for it. The wallet may ask you twice — once to allow EVA, once to send it.": "Tu asiento queda a nombre de la billetera que lo paga. La billetera puede pedírtelo dos veces: una para autorizar EVA y otra para enviarlo.",
    "Ticket paid": "Entrada pagada",
    "Enter the game": "Entrar al juego",
    "The board opens full screen when every seat is paid.": "El tablero se abre en pantalla completa cuando todos los asientos están pagados.",
    "The board opens full screen when everyone has joined.": "El tablero se abre en pantalla completa cuando todos se hayan unido.",
    "Share your invite": "Comparte tu invitación",
    "A link appears here as soon as the room is open.": "Aquí aparece un enlace en cuanto la sala esté abierta.",
    "One seat left. The link works until the room is full — after that it stops letting anyone in.": "Queda un asiento. El enlace funciona hasta que la sala se llene; después ya no deja entrar a nadie.",
    "Two seats left. The link works until the room is full — after that it stops letting anyone in.": "Quedan dos asientos. El enlace funciona hasta que la sala se llene; después ya no deja entrar a nadie.",
    "Three seats left. The link works until the room is full — after that it stops letting anyone in.": "Quedan tres asientos. El enlace funciona hasta que la sala se llene; después ya no deja entrar a nadie.",
    "Four seats left. The link works until the room is full — after that it stops letting anyone in.": "Quedan cuatro asientos. El enlace funciona hasta que la sala se llene; después ya no deja entrar a nadie.",
    "Five seats left. The link works until the room is full — after that it stops letting anyone in.": "Quedan cinco asientos. El enlace funciona hasta que la sala se llene; después ya no deja entrar a nadie.",
    "Take your seat": "Ocupa tu asiento",
    "Free play runs the full rulebook — same board, same cards, same dice. The only thing missing is the EVA. If the room fills up before you join, the link stops working.": "La partida gratis usa todas las reglas: el mismo tablero, las mismas cartas, los mismos dados. Lo único que falta es el EVA. Si la sala se llena antes de que entres, el enlace deja de funcionar.",

    // Room card
    "Your room": "Tu sala",
    "Paid": "Paga",
    "Free": "Gratis",
    "Your seats and ticket show up here once the wallet is connected.": "Tus asientos y tu entrada aparecen aquí cuando la billetera esté conectada.",
    "Host": "Anfitrión",
    "You": "Tú",
    "Player 1": "Jugador 1",
    "Open seat": "Asiento libre",
    "Invite link": "Enlace de invitación",
    "Invitation link": "Enlace de invitación",
    "Free game invitation link": "Enlace de invitación a la partida gratis",
    "Copy": "Copiar",
    "Ticket": "Entrada",
    "Seats": "Asientos",
    "Open the room": "Abrir la sala",
    "Retry ticket check": "Reintentar verificación de entrada",
    "Continue to payment": "Continuar al pago",
    "Take my seat": "Ocupar mi asiento",
    "Payment details and recovery": "Detalles y recuperación del pago",
    "Allowance": "Autorización",
    "Check balance": "Consultar saldo",
    "Approve EVA": "Autorizar EVA",
    "Pay ticket": "Pagar entrada",
    "Transaction hash": "Hash de la transacción",
    "Verify payment": "Verificar pago",
    "Recover payment": "Recuperar pago",
    "Clear": "Borrar",
    "Room details": "Detalles de la sala",
    "Review the invitation, connect your wallet, and reserve your seat.": "Revisa la invitación, conecta tu billetera y reserva tu asiento.",
    "Review the room details supplied by the invitation.": "Revisa los detalles de la sala que vienen en la invitación.",
    "The room is created. Share the invitation when these details are correct.": "La sala está creada. Comparte la invitación cuando estos detalles sean correctos.",
    "Players": "Jugadores",
    "Option": "Opción",
    "Created": "Creada",

    // Room card notices
    "Waiting for your wallet.": "Esperando tu billetera.",
    "Signing in doesn’t move funds.": "Iniciar sesión no mueve fondos.",
    "Connect your wallet to reserve your seat.": "Conecta tu billetera para reservar tu asiento.",
    "Add your display name to open the room.": "Agrega tu nombre visible para abrir la sala.",
    "Everything is set. You can open the room.": "Todo listo. Ya puedes abrir la sala.",
    "Everything is set. Opening the room is free.": "Todo listo. Abrir la sala es gratis.",
    "Opening the room is free. Signing doesn’t move funds.": "Abrir la sala es gratis. Firmar no mueve fondos.",
    "Checking your ticket…": "Verificando tu entrada…",
    "Checking this wallet for an existing ticket…": "Buscando una entrada existente en esta billetera…",
    "Your seat is not paid yet.": "Tu asiento todavía no está pagado.",
    "Your seat is not paid yet. Each player pays their own ticket.": "Tu asiento todavía no está pagado. Cada jugador paga su propia entrada.",
    "Each player pays their own ticket.": "Cada jugador paga su propia entrada.",
    "Could not check this wallet’s ticket.": "No se pudo verificar la entrada de esta billetera.",
    "Your seat is paid.": "Tu asiento está pagado.",
    "Your seat is paid. The board opens when every seat is paid.": "Tu asiento está pagado. El tablero se abre cuando todos los asientos estén pagados.",
    "Everything is set. No wallet, no payment, no sign-up.": "Todo listo. Sin billetera, sin pago, sin registro.",
    "No wallet, no payment, no sign-up.": "Sin billetera, sin pago, sin registro.",
    "Room created. Waiting for players.": "Sala creada. Esperando jugadores.",
    "You can wait on the board while the others arrive.": "Puedes esperar en el tablero mientras llegan los demás.",
    "Invitation loaded. One seat is free for you.": "Invitación cargada. Hay un asiento libre para ti.",
    "One seat is free for you. Nothing to pay.": "Hay un asiento libre para ti. No hay nada que pagar.",
    "Nothing to pay. The board opens once both of you are in.": "No hay nada que pagar. El tablero se abre cuando ambos hayan entrado.",
    "Nothing to pay. The board opens once all three are in.": "No hay nada que pagar. El tablero se abre cuando los tres hayan entrado.",
    "Nothing to pay. The board opens once all four are in.": "No hay nada que pagar. El tablero se abre cuando los cuatro hayan entrado.",
    "Nothing to pay. The board opens once all five are in.": "No hay nada que pagar. El tablero se abre cuando los cinco hayan entrado.",
    "Nothing to pay. The board opens once all six are in.": "No hay nada que pagar. El tablero se abre cuando los seis hayan entrado.",

    // Wallet and room status
    "Connecting wallet...": "Conectando billetera...",
    "The wallet did not return an account.": "La billetera no devolvió una cuenta.",
    "Requesting sign-in challenge...": "Solicitando el desafío de inicio de sesión...",
    "Waiting for wallet signature...": "Esperando la firma de la billetera...",
    "Verifying signature...": "Verificando la firma...",
    "Wallet connected.": "Billetera conectada.",
    "Connect wallet before creating a room.": "Conecta tu billetera antes de crear una sala.",
    "Creating room...": "Creando la sala...",
    "Looking up invite...": "Buscando la invitación...",
    "Loading invite...": "Cargando la invitación...",
    "Create or load a game before copying its invitation.": "Crea o carga una partida antes de copiar su invitación.",
    "Invite link copied.": "Enlace de invitación copiado.",
    "No injected wallet found. Open this page in a wallet-enabled browser.": "No se encontró una billetera. Abre esta página en un navegador con billetera.",
    "Network switch was cancelled in the wallet.": "El cambio de red se canceló en la billetera.",
    "Failed to switch network: {reason}": "No se pudo cambiar de red: {reason}",
    "Expected chain must be a positive numeric chain id.": "La red esperada debe ser un ID de cadena numérico positivo.",
    "Expected chain {chain} is not available in the wrapper presets.": "La red esperada {chain} no está disponible en los ajustes predefinidos.",
    "Could not reach the auth server at {origin}.": "No se pudo contactar al servidor de autenticación en {origin}.",
    "This page origin is not allowed by the auth server. Add {origin} to its allowed origins.": "El servidor de autenticación no permite el origen de esta página. Agrega {origin} a sus orígenes permitidos.",
    "Auth request failed with HTTP {status}.": "La solicitud de autenticación falló con HTTP {status}.",

    // Ticket check
    "Connect wallet to check whether you already have a ticket.": "Conecta tu billetera para comprobar si ya tienes una entrada.",
    "Checking this wallet for an existing ticket...": "Buscando una entrada existente en esta billetera...",
    "This wallet already has a ticket for this room.": "Esta billetera ya tiene una entrada para esta sala.",
    "No ticket found for this wallet and room. You can pay for one seat.": "No se encontró una entrada para esta billetera y sala. Puedes pagar un asiento.",
    "Could not check this wallet's ticket. Retry before paying.": "No se pudo verificar la entrada de esta billetera. Reintenta antes de pagar.",
    "A payment transaction is saved. Verify it before paying again, or clear an invalid hash.": "Hay una transacción de pago guardada. Verifícala antes de pagar de nuevo o borra un hash inválido.",
    "Ticket check failed with HTTP {status}.": "La verificación de la entrada falló con HTTP {status}.",

    // Payment
    "Checking your EVA balance...": "Consultando tu saldo de EVA...",
    "Your wallet does not have enough EVA for this ticket.": "Tu billetera no tiene suficiente EVA para esta entrada.",
    "Your wallet will first ask you to approve EVA for this ticket.": "Tu billetera primero te pedirá autorizar EVA para esta entrada.",
    "Checking EVA balance and allowance...": "Consultando el saldo y la autorización de EVA...",
    "Wallet balance is below this room ticket amount.": "El saldo de la billetera es menor que el precio de la entrada de esta sala.",
    "Approve EVA before paying this ticket.": "Autoriza EVA antes de pagar esta entrada.",
    "Balance and allowance are ready.": "El saldo y la autorización están listos.",
    "Requesting EVA approval in wallet...": "Solicitando la autorización de EVA en la billetera...",
    "Approval submitted: {hash}. Waiting for confirmation...": "Autorización enviada: {hash}. Esperando confirmación...",
    "Approval submitted: {hash}. It is not confirmed yet; wait a moment, then click Check balance.": "Autorización enviada: {hash}. Todavía no está confirmada; espera un momento y luego haz clic en Consultar saldo.",
    "Approval transaction failed: {hash}.": "La transacción de autorización falló: {hash}.",
    "A payment transaction is already saved for this wallet and room. Verify it before paying again.": "Ya hay una transacción de pago guardada para esta billetera y sala. Verifícala antes de pagar de nuevo.",
    "Checking allowance before payment...": "Consultando la autorización antes del pago...",
    "Wallet or room changed during payment. Check the ticket again.": "La billetera o la sala cambió durante el pago. Verifica la entrada de nuevo.",
    "Approve EVA and wait for the approval transaction to confirm before paying this ticket.": "Autoriza EVA y espera a que se confirme la transacción de autorización antes de pagar esta entrada.",
    "Submitting payment transaction in wallet...": "Enviando la transacción de pago en la billetera...",
    "Payment submitted: {hash}. Verifying...": "Pago enviado: {hash}. Verificando...",
    "Transaction preflight failed: {reason}": "La verificación previa de la transacción falló: {reason}",
    "Wallet transaction failed: {reason}": "La transacción de la billetera falló: {reason}",
    "The wallet submitted a stale gas fee below the current network base fee. Retry the transaction; if MetaMask keeps reusing the stale fee, edit the gas fee upward or clear the pending wallet activity for this account.": "La billetera envió una tarifa de gas desactualizada, menor que la tarifa base actual de la red. Reintenta la transacción; si MetaMask sigue usando la tarifa antigua, aumenta la tarifa de gas o borra la actividad pendiente de la billetera para esta cuenta.",
    "Load a room before using payment actions.": "Carga una sala antes de usar las acciones de pago.",
    "Connect wallet before using payment actions.": "Conecta tu billetera antes de usar las acciones de pago.",
    "Payment helper library did not load.": "No se cargó la biblioteca de pagos.",
    "Load a room before verifying payment.": "Carga una sala antes de verificar el pago.",
    "Connect wallet before verifying payment.": "Conecta tu billetera antes de verificar el pago.",
    "Enter a valid transaction hash.": "Ingresa un hash de transacción válido.",
    "Verifying payment...": "Verificando el pago...",
    "Payment verified in block {block}.": "Pago verificado en el bloque {block}.",
    "Payment verified.": "Pago verificado.",
    "Payment transaction saved locally.": "Transacción de pago guardada localmente.",
    "Searching the last {hours} hours for this payment...": "Buscando este pago en las últimas {hours} horas...",
    "No matching payment was recovered.": "No se recuperó ningún pago coincidente.",
    "Payment recovery succeeded, but no transaction hash was returned.": "La recuperación del pago funcionó, pero no devolvió un hash de transacción.",
    "Payment recovered and verified: {hash}.": "Pago recuperado y verificado: {hash}.",
    "{count} matching payments found. Paste one candidate transaction hash and verify it.": "Se encontraron {count} pagos coincidentes. Pega el hash de una transacción candidata y verifícala.",
    "{count} matching payments were found. Paste one candidate transaction hash and verify it.": "Se encontraron {count} pagos coincidentes. Pega el hash de una transacción candidata y verifícala.",
    "Multiple matching payments were found. Paste one candidate transaction hash and verify it.": "Se encontraron varios pagos coincidentes. Pega el hash de una transacción candidata y verifícala.",
    "Payment transaction found, but it is not confirmed yet. Wait for confirmations and try again.": "Se encontró la transacción de pago, pero todavía no está confirmada. Espera las confirmaciones e inténtalo de nuevo.",
    "Payment was not found yet. Wait for it to mine, verify again, or try Recover Payment.": "Todavía no se encontró el pago. Espera a que se mine, verifica de nuevo o prueba Recuperar pago.",
    "The payment proof did not match this wallet, room, or ticket amount.": "El comprobante de pago no coincide con esta billetera, sala o precio de entrada.",
    "Payment recovery is not enabled on this auth server.": "La recuperación de pagos no está habilitada en este servidor de autenticación.",
    "Payment verification is not enabled on this auth server.": "La verificación de pagos no está habilitada en este servidor de autenticación.",
    "Payment verification failed with HTTP {status}.": "La verificación del pago falló con HTTP {status}.",
    "Load a room before opening the paid client.": "Carga una sala antes de abrir el juego pago.",
    "Connect wallet before opening the paid client.": "Conecta tu billetera antes de abrir el juego pago.",
    "Check and confirm this wallet's ticket before opening the paid client.": "Verifica y confirma la entrada de esta billetera antes de abrir el juego pago.",
    "This wallet already has a ticket for this room. Open the paid client.": "Esta billetera ya tiene una entrada para esta sala. Abre el juego pago.",
    "Wait for the ticket check before using payment actions.": "Espera la verificación de la entrada antes de usar las acciones de pago.",
    "Multiple": "Varios",
    "Wallet account changed. Connect again.": "Cambió la cuenta de la billetera. Conéctate de nuevo.",
    "Wallet network changed. Connect again.": "Cambió la red de la billetera. Conéctate de nuevo.",
    "The ticket price appears once the invitation loads. Your wallet may ask twice: first to allow EVA, then to pay.": "El precio de la entrada aparece cuando se carga la invitación. Tu billetera puede pedirlo dos veces: primero para autorizar EVA y luego para pagar.",
  },

  pt_br: {
    // Page titles and landmarks
    "Evanopolis · Create a game": "Evanopolis · Criar partida",
    "Evanopolis · Free game": "Evanopolis · Partida grátis",
    "Room entry flow": "Fluxo de entrada na sala",
    "Free game entry flow": "Fluxo de entrada na partida grátis",
    "Legal": "Jurídico",
    "Language": "Idioma",
    "Open menu": "Abrir menu",
    "Switch to dark theme": "Mudar para o tema escuro",
    "Switch to light theme": "Mudar para o tema claro",

    // Header and footer
    "Wallet": "Carteira",
    "Not connected": "Não conectada",
    "Balance": "Saldo",
    "Buy EVA": "Comprar EVA",
    "© 2026 EverValue Ecosystem. All rights reserved.": "© 2026 EverValue Ecosystem. Todos os direitos reservados.",
    "Privacy policy": "Política de privacidade",
    "Terms of service": "Termos de serviço",

    // Hero
    "New room": "Nova sala",
    "Room open": "Sala aberta",
    "Invitation": "Convite",
    "Free game": "Partida grátis",
    "Create a game": "Crie uma partida",
    "Choose how many players and what the ticket costs. We open the room and give you a link to invite them — the game starts once everyone has joined.": "Escolha quantos jogadores e quanto custa a entrada. Nós abrimos a sala e damos a você um link para convidá-los — a partida começa quando todos entrarem.",
    "Your room is open": "Sua sala está aberta",
    "Send the link to your players. Each one pays their own ticket, and the board opens as soon as every seat is paid.": "Envie o link para seus jogadores. Cada um paga a própria entrada, e o tabuleiro abre assim que todos os lugares estiverem pagos.",
    "You’re invited": "Você foi convidado",
    "{host} saved you a seat in a paid game of Evanopolis. Connect your wallet, pay your ticket, and the board opens once every seat is paid.": "{host} reservou um lugar para você em uma partida paga de Evanopolis. Conecte sua carteira, pague sua entrada e o tabuleiro abre quando todos os lugares estiverem pagos.",
    "Someone": "Alguém",
    "No wallet?": "Sem carteira?",
    "Play a free game instead": "Jogue uma partida grátis",
    "Create a free game": "Crie uma partida grátis",
    "No wallet and no ticket. Choose how many players, share the link, and play the full board — same rules, nothing at stake.": "Sem carteira e sem entrada. Escolha quantos jogadores, compartilhe o link e jogue o tabuleiro completo — as mesmas regras, sem nada em jogo.",
    "Your free game is ready": "Sua partida grátis está pronta",
    "Send the link to your players. Anyone with it takes a seat — no wallet, no sign-up. You can enter the board and wait for them there.": "Envie o link para seus jogadores. Quem tiver o link ocupa um lugar — sem carteira, sem cadastro. Você pode entrar no tabuleiro e esperá-los lá.",
    "Someone saved you a seat in a free game of Evanopolis. No wallet, no ticket, no account — take the seat and the board opens.": "Alguém reservou um lugar para você em uma partida grátis de Evanopolis. Sem carteira, sem entrada, sem conta — ocupe o lugar e o tabuleiro abre.",
    "Have EVA?": "Tem EVA?",
    "Play for a ticket instead": "Jogue com entrada",

    // Steps
    "Connect your wallet": "Conecte sua carteira",
    "Your wallet is how the game knows the seat is yours. You’ll sign a short message to log in — a signature proves who you are, it never moves EVA. The ticket is paid later, in its own step.": "Sua carteira é como o jogo sabe que o lugar é seu. Você vai assinar uma mensagem curta para entrar — uma assinatura prova quem você é e nunca movimenta EVA. A entrada é paga depois, em uma etapa própria.",
    "Connect wallet": "Conectar carteira",
    "Wallet connected": "Carteira conectada",
    "Change": "Trocar",
    "Set up your game": "Configure sua partida",
    "Review this game": "Revise esta partida",
    "Your name, how many seats, and what the ticket costs.": "Seu nome, quantos lugares e quanto custa a entrada.",
    "Your display name": "Seu nome de exibição",
    "Your name": "Seu nome",
    "Number of players": "Número de jogadores",
    "Ticket per player": "Entrada por jogador",
    "Cheap": "Econômica",
    "Average": "Média",
    "Deluxe": "Deluxe",
    "Or set your own amount": "Ou defina seu próprio valor",
    "e.g. 2.5": "ex. 2.5",
    "From 0.01 to 1000 EVA, up to 2 decimals.": "De 0.01 a 1000 EVA, com até 2 casas decimais.",
    "Enter a ticket from 0.01 to 1000 EVA, up to 2 decimals.": "Informe uma entrada de 0.01 a 1000 EVA, com até 2 casas decimais.",
    "Game set up": "Partida configurada",
    "Invitation loaded": "Convite carregado",
    "Edit": "Editar",
    "Start over": "Recomeçar",
    "{game} · {count} players · {price}": "{game} · {count} jogadores · {price}",
    "Paid game": "Partida paga",
    "Free game · ": "Partida grátis · ",
    " players · 1 seat taken": " jogadores · 1 lugar ocupado",
    " players · Free": " jogadores · Grátis",
    "Pay your ticket": "Pague sua entrada",
    "{price}, once the room is open. Your wallet may ask twice: first to allow EVA, then to pay.": "{price}, quando a sala estiver aberta. Sua carteira pode pedir duas vezes: primeiro para autorizar EVA, depois para pagar.",
    "Your seat is held by the wallet that pays for it. The wallet may ask you twice — once to allow EVA, once to send it.": "Seu lugar fica com a carteira que paga por ele. A carteira pode pedir duas vezes — uma para autorizar EVA e outra para enviá-lo.",
    "Ticket paid": "Entrada paga",
    "Enter the game": "Entrar no jogo",
    "The board opens full screen when every seat is paid.": "O tabuleiro abre em tela cheia quando todos os lugares estiverem pagos.",
    "The board opens full screen when everyone has joined.": "O tabuleiro abre em tela cheia quando todos entrarem.",
    "Share your invite": "Compartilhe seu convite",
    "A link appears here as soon as the room is open.": "Um link aparece aqui assim que a sala estiver aberta.",
    "One seat left. The link works until the room is full — after that it stops letting anyone in.": "Resta um lugar. O link funciona até a sala lotar — depois disso ele não deixa mais ninguém entrar.",
    "Two seats left. The link works until the room is full — after that it stops letting anyone in.": "Restam dois lugares. O link funciona até a sala lotar — depois disso ele não deixa mais ninguém entrar.",
    "Three seats left. The link works until the room is full — after that it stops letting anyone in.": "Restam três lugares. O link funciona até a sala lotar — depois disso ele não deixa mais ninguém entrar.",
    "Four seats left. The link works until the room is full — after that it stops letting anyone in.": "Restam quatro lugares. O link funciona até a sala lotar — depois disso ele não deixa mais ninguém entrar.",
    "Five seats left. The link works until the room is full — after that it stops letting anyone in.": "Restam cinco lugares. O link funciona até a sala lotar — depois disso ele não deixa mais ninguém entrar.",
    "Take your seat": "Ocupe seu lugar",
    "Free play runs the full rulebook — same board, same cards, same dice. The only thing missing is the EVA. If the room fills up before you join, the link stops working.": "A partida grátis usa todas as regras — o mesmo tabuleiro, as mesmas cartas, os mesmos dados. A única coisa que falta é o EVA. Se a sala lotar antes de você entrar, o link para de funcionar.",

    // Room card
    "Your room": "Sua sala",
    "Paid": "Paga",
    "Free": "Grátis",
    "Your seats and ticket show up here once the wallet is connected.": "Seus lugares e sua entrada aparecem aqui quando a carteira estiver conectada.",
    "Host": "Anfitrião",
    "You": "Você",
    "Player 1": "Jogador 1",
    "Open seat": "Lugar livre",
    "Invite link": "Link de convite",
    "Invitation link": "Link de convite",
    "Free game invitation link": "Link de convite da partida grátis",
    "Copy": "Copiar",
    "Ticket": "Entrada",
    "Seats": "Lugares",
    "Open the room": "Abrir a sala",
    "Retry ticket check": "Verificar a entrada de novo",
    "Continue to payment": "Continuar para o pagamento",
    "Take my seat": "Ocupar meu lugar",
    "Payment details and recovery": "Detalhes e recuperação do pagamento",
    "Allowance": "Autorização",
    "Check balance": "Consultar saldo",
    "Approve EVA": "Autorizar EVA",
    "Pay ticket": "Pagar entrada",
    "Transaction hash": "Hash da transação",
    "Verify payment": "Verificar pagamento",
    "Recover payment": "Recuperar pagamento",
    "Clear": "Limpar",
    "Room details": "Detalhes da sala",
    "Review the invitation, connect your wallet, and reserve your seat.": "Revise o convite, conecte sua carteira e reserve seu lugar.",
    "Review the room details supplied by the invitation.": "Revise os detalhes da sala que vieram no convite.",
    "The room is created. Share the invitation when these details are correct.": "A sala foi criada. Compartilhe o convite quando estes detalhes estiverem corretos.",
    "Players": "Jogadores",
    "Option": "Opção",
    "Created": "Criada",

    // Room card notices
    "Waiting for your wallet.": "Aguardando sua carteira.",
    "Signing in doesn’t move funds.": "Entrar não movimenta fundos.",
    "Connect your wallet to reserve your seat.": "Conecte sua carteira para reservar seu lugar.",
    "Add your display name to open the room.": "Adicione seu nome de exibição para abrir a sala.",
    "Everything is set. You can open the room.": "Tudo pronto. Você já pode abrir a sala.",
    "Everything is set. Opening the room is free.": "Tudo pronto. Abrir a sala é grátis.",
    "Opening the room is free. Signing doesn’t move funds.": "Abrir a sala é grátis. Assinar não movimenta fundos.",
    "Checking your ticket…": "Verificando sua entrada…",
    "Checking this wallet for an existing ticket…": "Procurando uma entrada existente nesta carteira…",
    "Your seat is not paid yet.": "Seu lugar ainda não foi pago.",
    "Your seat is not paid yet. Each player pays their own ticket.": "Seu lugar ainda não foi pago. Cada jogador paga a própria entrada.",
    "Each player pays their own ticket.": "Cada jogador paga a própria entrada.",
    "Could not check this wallet’s ticket.": "Não foi possível verificar a entrada desta carteira.",
    "Your seat is paid.": "Seu lugar está pago.",
    "Your seat is paid. The board opens when every seat is paid.": "Seu lugar está pago. O tabuleiro abre quando todos os lugares estiverem pagos.",
    "Everything is set. No wallet, no payment, no sign-up.": "Tudo pronto. Sem carteira, sem pagamento, sem cadastro.",
    "No wallet, no payment, no sign-up.": "Sem carteira, sem pagamento, sem cadastro.",
    "Room created. Waiting for players.": "Sala criada. Aguardando jogadores.",
    "You can wait on the board while the others arrive.": "Você pode esperar no tabuleiro enquanto os outros chegam.",
    "Invitation loaded. One seat is free for you.": "Convite carregado. Há um lugar livre para você.",
    "One seat is free for you. Nothing to pay.": "Há um lugar livre para você. Nada a pagar.",
    "Nothing to pay. The board opens once both of you are in.": "Nada a pagar. O tabuleiro abre quando vocês dois entrarem.",
    "Nothing to pay. The board opens once all three are in.": "Nada a pagar. O tabuleiro abre quando os três entrarem.",
    "Nothing to pay. The board opens once all four are in.": "Nada a pagar. O tabuleiro abre quando os quatro entrarem.",
    "Nothing to pay. The board opens once all five are in.": "Nada a pagar. O tabuleiro abre quando os cinco entrarem.",
    "Nothing to pay. The board opens once all six are in.": "Nada a pagar. O tabuleiro abre quando os seis entrarem.",

    // Wallet and room status
    "Connecting wallet...": "Conectando a carteira...",
    "The wallet did not return an account.": "A carteira não retornou uma conta.",
    "Requesting sign-in challenge...": "Solicitando o desafio de login...",
    "Waiting for wallet signature...": "Aguardando a assinatura da carteira...",
    "Verifying signature...": "Verificando a assinatura...",
    "Wallet connected.": "Carteira conectada.",
    "Connect wallet before creating a room.": "Conecte sua carteira antes de criar uma sala.",
    "Creating room...": "Criando a sala...",
    "Looking up invite...": "Buscando o convite...",
    "Loading invite...": "Carregando o convite...",
    "Create or load a game before copying its invitation.": "Crie ou carregue uma partida antes de copiar o convite.",
    "Invite link copied.": "Link de convite copiado.",
    "No injected wallet found. Open this page in a wallet-enabled browser.": "Nenhuma carteira encontrada. Abra esta página em um navegador com carteira.",
    "Network switch was cancelled in the wallet.": "A troca de rede foi cancelada na carteira.",
    "Failed to switch network: {reason}": "Não foi possível trocar de rede: {reason}",
    "Expected chain must be a positive numeric chain id.": "A rede esperada deve ser um ID de cadeia numérico positivo.",
    "Expected chain {chain} is not available in the wrapper presets.": "A rede esperada {chain} não está disponível nas predefinições.",
    "Could not reach the auth server at {origin}.": "Não foi possível acessar o servidor de autenticação em {origin}.",
    "This page origin is not allowed by the auth server. Add {origin} to its allowed origins.": "O servidor de autenticação não permite a origem desta página. Adicione {origin} às origens permitidas.",
    "Auth request failed with HTTP {status}.": "A solicitação de autenticação falhou com HTTP {status}.",

    // Ticket check
    "Connect wallet to check whether you already have a ticket.": "Conecte sua carteira para verificar se você já tem uma entrada.",
    "Checking this wallet for an existing ticket...": "Procurando uma entrada existente nesta carteira...",
    "This wallet already has a ticket for this room.": "Esta carteira já tem uma entrada para esta sala.",
    "No ticket found for this wallet and room. You can pay for one seat.": "Nenhuma entrada encontrada para esta carteira e sala. Você pode pagar por um lugar.",
    "Could not check this wallet's ticket. Retry before paying.": "Não foi possível verificar a entrada desta carteira. Tente de novo antes de pagar.",
    "A payment transaction is saved. Verify it before paying again, or clear an invalid hash.": "Há uma transação de pagamento salva. Verifique-a antes de pagar de novo ou limpe um hash inválido.",
    "Ticket check failed with HTTP {status}.": "A verificação da entrada falhou com HTTP {status}.",

    // Payment
    "Checking your EVA balance...": "Consultando seu saldo de EVA...",
    "Your wallet does not have enough EVA for this ticket.": "Sua carteira não tem EVA suficiente para esta entrada.",
    "Your wallet will first ask you to approve EVA for this ticket.": "Sua carteira primeiro vai pedir que você autorize EVA para esta entrada.",
    "Checking EVA balance and allowance...": "Consultando o saldo e a autorização de EVA...",
    "Wallet balance is below this room ticket amount.": "O saldo da carteira é menor que o valor da entrada desta sala.",
    "Approve EVA before paying this ticket.": "Autorize EVA antes de pagar esta entrada.",
    "Balance and allowance are ready.": "O saldo e a autorização estão prontos.",
    "Requesting EVA approval in wallet...": "Solicitando a autorização de EVA na carteira...",
    "Approval submitted: {hash}. Waiting for confirmation...": "Autorização enviada: {hash}. Aguardando confirmação...",
    "Approval submitted: {hash}. It is not confirmed yet; wait a moment, then click Check balance.": "Autorização enviada: {hash}. Ainda não foi confirmada; aguarde um momento e clique em Consultar saldo.",
    "Approval transaction failed: {hash}.": "A transação de autorização falhou: {hash}.",
    "A payment transaction is already saved for this wallet and room. Verify it before paying again.": "Já existe uma transação de pagamento salva para esta carteira e sala. Verifique-a antes de pagar de novo.",
    "Checking allowance before payment...": "Consultando a autorização antes do pagamento...",
    "Wallet or room changed during payment. Check the ticket again.": "A carteira ou a sala mudou durante o pagamento. Verifique a entrada de novo.",
    "Approve EVA and wait for the approval transaction to confirm before paying this ticket.": "Autorize EVA e aguarde a confirmação da transação de autorização antes de pagar esta entrada.",
    "Submitting payment transaction in wallet...": "Enviando a transação de pagamento na carteira...",
    "Payment submitted: {hash}. Verifying...": "Pagamento enviado: {hash}. Verificando...",
    "Transaction preflight failed: {reason}": "A verificação prévia da transação falhou: {reason}",
    "Wallet transaction failed: {reason}": "A transação da carteira falhou: {reason}",
    "The wallet submitted a stale gas fee below the current network base fee. Retry the transaction; if MetaMask keeps reusing the stale fee, edit the gas fee upward or clear the pending wallet activity for this account.": "A carteira enviou uma taxa de gás desatualizada, abaixo da taxa base atual da rede. Tente a transação de novo; se o MetaMask continuar usando a taxa antiga, aumente a taxa de gás ou limpe a atividade pendente da carteira para esta conta.",
    "Load a room before using payment actions.": "Carregue uma sala antes de usar as ações de pagamento.",
    "Connect wallet before using payment actions.": "Conecte sua carteira antes de usar as ações de pagamento.",
    "Payment helper library did not load.": "A biblioteca de pagamentos não carregou.",
    "Load a room before verifying payment.": "Carregue uma sala antes de verificar o pagamento.",
    "Connect wallet before verifying payment.": "Conecte sua carteira antes de verificar o pagamento.",
    "Enter a valid transaction hash.": "Informe um hash de transação válido.",
    "Verifying payment...": "Verificando o pagamento...",
    "Payment verified in block {block}.": "Pagamento verificado no bloco {block}.",
    "Payment verified.": "Pagamento verificado.",
    "Payment transaction saved locally.": "Transação de pagamento salva localmente.",
    "Searching the last {hours} hours for this payment...": "Procurando este pagamento nas últimas {hours} horas...",
    "No matching payment was recovered.": "Nenhum pagamento correspondente foi recuperado.",
    "Payment recovery succeeded, but no transaction hash was returned.": "A recuperação do pagamento funcionou, mas nenhum hash de transação foi retornado.",
    "Payment recovered and verified: {hash}.": "Pagamento recuperado e verificado: {hash}.",
    "{count} matching payments found. Paste one candidate transaction hash and verify it.": "{count} pagamentos correspondentes encontrados. Cole o hash de uma transação candidata e verifique-a.",
    "{count} matching payments were found. Paste one candidate transaction hash and verify it.": "{count} pagamentos correspondentes foram encontrados. Cole o hash de uma transação candidata e verifique-a.",
    "Multiple matching payments were found. Paste one candidate transaction hash and verify it.": "Vários pagamentos correspondentes foram encontrados. Cole o hash de uma transação candidata e verifique-a.",
    "Payment transaction found, but it is not confirmed yet. Wait for confirmations and try again.": "A transação de pagamento foi encontrada, mas ainda não foi confirmada. Aguarde as confirmações e tente de novo.",
    "Payment was not found yet. Wait for it to mine, verify again, or try Recover Payment.": "O pagamento ainda não foi encontrado. Aguarde a mineração, verifique de novo ou tente Recuperar pagamento.",
    "The payment proof did not match this wallet, room, or ticket amount.": "O comprovante de pagamento não corresponde a esta carteira, sala ou valor de entrada.",
    "Payment recovery is not enabled on this auth server.": "A recuperação de pagamentos não está habilitada neste servidor de autenticação.",
    "Payment verification is not enabled on this auth server.": "A verificação de pagamentos não está habilitada neste servidor de autenticação.",
    "Payment verification failed with HTTP {status}.": "A verificação do pagamento falhou com HTTP {status}.",
    "Load a room before opening the paid client.": "Carregue uma sala antes de abrir o jogo pago.",
    "Connect wallet before opening the paid client.": "Conecte sua carteira antes de abrir o jogo pago.",
    "Check and confirm this wallet's ticket before opening the paid client.": "Verifique e confirme a entrada desta carteira antes de abrir o jogo pago.",
    "This wallet already has a ticket for this room. Open the paid client.": "Esta carteira já tem uma entrada para esta sala. Abra o jogo pago.",
    "Wait for the ticket check before using payment actions.": "Aguarde a verificação da entrada antes de usar as ações de pagamento.",
    "Multiple": "Vários",
    "Wallet account changed. Connect again.": "A conta da carteira mudou. Conecte de novo.",
    "Wallet network changed. Connect again.": "A rede da carteira mudou. Conecte de novo.",
    "The ticket price appears once the invitation loads. Your wallet may ask twice: first to allow EVA, then to pay.": "O valor da entrada aparece quando o convite carregar. Sua carteira pode pedir duas vezes: primeiro para autorizar EVA, depois para pagar.",
  },
};
