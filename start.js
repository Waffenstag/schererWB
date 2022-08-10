//  https://www.monroe.com.br/catalogo/produtos/codigo-produto?buscaProduto=x
//  https://www.monroeaxios.com.br/products/cross-reference?crossReference=x
//  https://api-pioneiro.appspot.com/pub/produto?marca=Nissan

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const client = new Client({ 
    authStrategy: new LocalAuth(),
    puppeteer: { 
        product: "chrome", 
        executablePath: "/usr/bin/chromium-browser",
        headless: true,
        handleSIGINT: false,
      args: [
          '--no-sandbox',
          '--disable-setuid-sandbox']
    },      
});
const axios = require('axios');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

//Gerando QR code para autentificar:
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

//Aviso quando o cliente estiver pronto:
client.on('ready', () => {
    console.log('Cliente Ativo!');
});

//Setando recursos do DB sqlite;
var sqlite3 = require('sqlite3');
const { stringify } = require('querystring');
var db = new sqlite3.Database('users.db');
var dbl = new sqlite3.Database('list.db');

//Criando tabela "users" com as colunas Id, Number, Name, caso não existe:
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, number INTEGER, name TEXT)')
})

//Criando tabela "list" com as colunas id, codScherer, codIndustria, usuario, datas e horario
dbl.serialize(() => {
    dbl.run('CREATE TABLE IF NOT EXISTS list (id INTEGER PRIMARY KEY, codScherer TEXT, codIndustria TEXT, usuario TEXT, datas TEXT, horario TEXT)')
})

//Função para salvar valores nas colunas:
async function saveDBL(xl, yl, zl, wl, vl){
    return dbl.run('INSERT INTO list (codScherer, codIndustria, usuario, datas, horario) VALUES (?, ?, ?, ?, ?)',[xl, yl, zl, wl, vl]);
}

//Função para salvar dois valores nas colunas number e name:
async function saveDB(xs, ys){
    return db.run('INSERT INTO users (number, name) VALUES (?, ?)',[xs, ys]);
}

//Função para selecionar a coluna number da linha onde o valor number é igual a variável (caso vazia = undefined): 
async function checkDB(xc){
   return db.get('SELECT number FROM users WHERE number = ?', [xc], function(err, row) {
    console.log("numero = " + row)
    });
    
}

//Função para extrair data do timestamp da mensagem
function timeConverter(UNIX_timestamp){
    var objdata = new Date(UNIX_timestamp * 1000);
    var ano = objdata.getFullYear();
    var mes = objdata.getMonth() + 1;
    var dia = objdata.getDate();
    var datavar = dia + '/' + mes + '/' + ano;
    return datavar;
  }

//Função para extrair hora e dia da semana do timestamp da mensagem
  function timeConverter2(UNIX_timestamp){
    var objhora = new Date(UNIX_timestamp * 1000);
    var dia = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    var hora = objhora.getHours();
    var min = objhora.getMinutes();
    var sec = objhora.getSeconds();
    var diasemana = dia[objhora.getDay()];
    var time = diasemana + ", " + hora + ':' + min + ':' + sec;
    return time;
  }

//Função para retirar vestígios da formatação JSON depois do stringify (gambiarra)
  function SetReplace(lista) {                                              
    lista1 = lista.replace(/codScherer|codIndustria|usuario|"|:|]|}/g, "");
    lista2 = lista1.replace(/,/g, "  ");
    lista3 = lista2.replace(/{/g, "\n");
    lista4 = lista3.replace("[", "");
    return lista4;
  }




//Main:
client.on('message', async msg => {
    //Se msg = "!cadastrar":
    if (msg.body === '!cadastrar') {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)

        let stringFrom = msg.from;
        let telefoneString = stringFrom.slice(0,-5);
        let telefonePrefixo = telefoneString.slice(0,2);
        let telefoneDDD = telefoneString.slice(2,4);
        let telefone = telefoneString.slice(4,telefoneString.length); 
        let setmsg = "Bem vindo +" + telefonePrefixo + " (" + telefoneDDD + ") " + telefone + ", envie o comando *!nome* seguido do nome que deseja vincular a esse contato.\n\n    (exemplo: *!nome Pedro*)";
        client.sendMessage(msg.from, setmsg);
    }

    //Se msg iniciar com "!nome " (com espaço no final):
    else if (msg.body.startsWith('!nome ')) {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)

        let nome = msg.body.replace("!nome ","");
        let numero = msg.from.replace("@c.us","");
        let msgApresentaçao = "Bem vindo " + nome + ", para requisitar uma peça envie o código Scherer referente com o comando *#* seguido do código.\n\n   (exemplo: *#19117*)";
                
        return db.get('SELECT number FROM users WHERE number = ?', [numero], function(err, row) {
            console.log("numero = " + row)
            if (row == undefined) {
                saveDB(numero, nome);
                client.sendMessage(msg.from, msgApresentaçao);
            }
            else {
                client.sendMessage(msg.from, "Neste número já existe um nome vinculado.");
            }

        })     
                
    } 

    //else para apagar registro de contato
    else if (msg.body === '!apagarnome') {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)
        let numero = msg.from.replace("@c.us","");
        let msgapagado = "O resgitro vinculado ao seu número foi apagado.";
                
        return db.get('SELECT number FROM users WHERE number = ?', [numero], function(err, row) {
            console.log("numero = " + row)
            if (row != undefined) {
                db.run('DELETE FROM users WHERE number = ?', [numero]);
                client.sendMessage(msg.from, msgapagado);
            } else {
                client.sendMessage(msg.from, "Não existe registro neste número para ser apagado.");
            }

        })     
                
    }

//else if para apagar o ultimo registro do scherer do msg.from (se o telefone esta registrado com nome e se o codScherer, pedido pelo usuario na data de hoje existe)
    else if (msg.body.startsWith('!apagar ')) {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)
        let apagarcod = msg.body.replace("!apagar ", "");
        let numero = msg.from.replace("@c.us","");
        let datas = timeConverter(msg.timestamp);

        return db.get('SELECT * FROM users WHERE number = ?', [numero], function(err, row) {
              
            if (row != undefined) {
                console.log("nome = " + row.name)
                return dbl.get('SELECT codScherer FROM list WHERE codScherer = ? AND usuario = ? AND datas = ?', [apagarcod, row.name, datas], function(err, rows) {
                    
                    if (rows != undefined) {
                        console.log("Scherer = " + rows.codScherer)
                        dbl.run('DELETE FROM list WHERE id = (SELECT MAX(id) FROM list WHERE codScherer = ? AND usuario = ?)', [apagarcod, row.name]);
                        client.sendMessage(msg.from, "Scherer " + apagarcod + " removido da lista.");

                    } else {
                        client.sendMessage(msg.from, "Este Scherer não está na lista de requisição no seu número hoje para ser apagado.");
                    }
                });

            } 
            else { client.sendMessage(msg.from, "Este número ainda não está registrado, envie o comando *!cadastrar* para se vincular um nome a esse contato.");
            } 
        });       
    }

    ////////////////////////////////////////// # //////////////////////////////////////////
    
    //Se menssagem começar com "#":
    else if (msg.body.startsWith('#')) {
    let codSch = msg.body.split('#')[1];  
    let URL = 'https://www.scherer-sa.com.br/promocoes?parametro=cod_scherer&busca=' + codSch;        
    let numero = msg.from.replace("@c.us","");
    let datas = timeConverter(msg.timestamp);
    let horario = timeConverter2(msg.timestamp);
    console.log("1/8 Requisição:" + msg.from, " ", msg.body, " ", datas + horario, " ", msg.deviceType)


        //Busca toda a linha na tabela users que coluna number seja igual ao numero definido (msg.from):
        return db.get('SELECT * FROM users WHERE number = ?', [numero], async function(err, row) {
            console.log("2/8 Objeto row identificado = " + row)
            

            if (row == undefined) {
                client.sendMessage(msg.from, "Este número ainda não está registrado, envie o comando *!cadastrar* para se vincular um nome a esse contato.");
            } 
            else { 
                if (isNaN(codSch) === false) {
                    
                                try {
                                    console.log("3/8 Definindo URL")
                                    const { data } = await axios.get(URL);
                                    const dom = new JSDOM(data);
                                    const { document } = dom.window
                                    
                                    console.log("4/8 Buscando elementos no arquivo DOM")
                                    const codigop = document.querySelector("div > div > div > a > p").lastChild.textContent;
                                    const codigopr = codigop.replace("\t\t\t\t\t\t\t\t\t\t", "");
                                    const descricao = document.querySelector("#promocoes > div > div > div > a > h4").textContent;

                                    var vendedor = row.name;
                                    var msgaddlist = "Scherer " + codSch + " adicionado a lista de requisição:\n\n" + "   *(" + codigopr +  " )* \n\n" + descricao;
                                    client.sendMessage(msg.from, msgaddlist);
                                    console.log("5/8 Scherer: " + codSch)

                                    console.log("6/8 Fazendo converção dos Objetos em string")
                                    var datasdb = stringify(datas);
                                    var horariodb = stringify(horario);
                                    
                                    saveDBL(codSch, codigopr, vendedor, datas, horario);
                                    console.log("7/8 Propriedades salvas em list.db com sucesso")
                                    let datasx = timeConverter(msg.timestamp);
                                    //Busca linhas na tabela list, formata o conteúdo e envia para si mesmo (msg.to):
                                    dbl.all("SELECT codScherer, codIndustria, usuario FROM list WHERE datas = ?",  [datasx], function(err, rows) {
                                        var texto = JSON.stringify(rows);
                                        msglista = SetReplace(texto);
                                        console.log(msglista)
                                        var randomNum = "555555555555@c.us";
                                        client.sendMessage(randomNum, msglista); 
                                        console.log("8/8 Lista enviada ao telefonista.")
                                    });
                                } 
                                catch (err) {            
                                    client.sendMessage(msg.from, "Nenhum produto encontrado!");
                                    console.error(err)
                                    console.log("-Nenhum produto encontrado!") 
                                }
                } 
                else 
                    { console.log("Requisição não é válida");
                }
            }    
        });
    }

    //Se msg iniciar com "!informe " (com espaço no final) para retornar a lista do dia (no formato d/m/ano):
    else if (msg.body.startsWith('!informe ')) {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)
        let datainforme = msg.body.replace("!informe ","");

        dbl.all("SELECT codScherer, codIndustria, usuario FROM list WHERE datas = ?",  [datainforme], function(err, rows) {
            var listajson = JSON.stringify(rows);
            msglista = SetReplace(listajson);
            console.log(msglista)
            client.sendMessage(msg.from, msglista); 
            console.log("Lista enviada ao telefonista.")
        });
    } 
    
    //else para baixar list.db
    else if (msg.body === '!download') {
        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)
        
        const { MessageMedia } = require('whatsapp-web.js');
        let chat = await msg.getChat();
        const media = MessageMedia.fromFilePath('./list.db');
        chat.sendMessage(media);
 
            console.log("Arquivo enviado.")
        
    } 

    //Else para mandar mensagem para a lista de requisição
    else if (msg.body.startsWith("!msg ")) {

        console.log(msg.from, " ", msg.body, " ", timeConverter2(msg.timestamp), " ", msg.deviceType)
        let numero = msg.from.replace("@c.us","");
        return db.get('SELECT * FROM users WHERE number = ?', [numero], async function(err, row) {
            if (row == undefined) {
                client.sendMessage(msg.from, "Este número ainda não está registrado, envie o comando *!cadastrar* para se vincular um nome a esse contato.");
            } 
            else { 
                let msgtolist = msg.body.replace('!msg ', "");
                let datas = timeConverter(msg.timestamp);
                let horario = timeConverter2(msg.timestamp);
                let codlist = "Mensagem";
                var vendedor = row.name;
                let codigopr = msgtolist;
                await saveDBL(codlist, msgtolist, vendedor, datas, horario);

                dbl.all("SELECT codScherer, codIndustria, usuario FROM list", function(err, rows) {
                    var texto = JSON.stringify(rows);
                    msglista = SetReplace(texto);
                    console.log(msglista)
                    client.sendMessage(msg.to, msglista); 
                    console.log("Lista enviada ao telefonista.")
                });

            }
        });
        
    } 



    



});

//    
process.on("SIGINT", async () => {
    console.log("(SIGINT) Encerrando cliente...");
    await client.destroy();
    process.exit(0);
    })

    
client.initialize();

// Group check
//Add #msg (N serie turbina)            if (isNaN(codSch) === false) {
