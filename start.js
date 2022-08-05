//  https://www.monroe.com.br/catalogo/produtos/codigo-produto?buscaProduto=x
//  https://www.monroeaxios.com.br/products/cross-reference?crossReference=x
//  https://api-pioneiro.appspot.com/pub/produto?marca=Nissan


//Importando recursos:
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
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

//
dbl.serialize(() => {
    dbl.run('CREATE TABLE IF NOT EXISTS list (id INTEGER PRIMARY KEY, codScherer INTEGER, codIndustria TEXT, usuario TEXT, data TEXT)')
})
//Função para salvar valores nas colunas:
async function saveDBL(xl, yl, zl, wl){
    return dbl.run('INSERT INTO list (codScherer, codIndustria, usuario, data) VALUES (?, ?, ?, ?)',[xl, yl, zl, wl]);
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

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var day = days[a.getDay()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec + " " + day;
    return time;
  }




//Abrindo função principal de automatizaçao:
client.on('message', async msg => {
    //Se msg = "!cadastrar":
    if (msg.body === '!cadastrar') {
        console.log(msg.from, " ", msg.body, " ", timeConverter(msg.timestamp), " ", msg.deviceType) //LOG 

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
        console.log(msg.from, " ", msg.body, " ", timeConverter(msg.timestamp), " ", msg.deviceType) //LOG 

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


    ////////////////////////////////////////// checkpoint //////////////////////////////////////////
    
    //Se menssagem começar com "#":


    else if (msg.body.startsWith('#')) {
    let codSch = msg.body.split('#')[1];  
    let URL = 'https://www.scherer-sa.com.br/promocoes?parametro=cod_scherer&busca=' + codSch;        
    let numero = msg.from.replace("@c.us","");
    let datahorario = timeConverter(msg.timestamp);
    let eu = msg.to;
    console.log("1/5 Requisição:" + msg.from, " ", msg.body, " ", datahorario, " ", msg.deviceType) //LOG

    

        //Busca toda a linha na tabela users que coluna number seja igual ao numero definido (msg.from):
        return db.get('SELECT * FROM users WHERE number = ?', [numero], async function(err, row) {
            console.log("2/5 Objeto row identificado = " + row)
            

            if (row == undefined) {
                client.sendMessage(msg.from, "Este número ainda não está registrado, envie o comando *!cadastrar* para se vincular um nome a esse contato.");
            } 
            else { 
                if (isNaN(codSch) === false) {

                                try {
                                    console.log("3/5 Definindo URL")
                                    const { data } = await axios.get(URL);
                                    const dom = new JSDOM(data);
                                    const { document } = dom.window
                                    
                                    console.log("4/5 Buscando elementos no arquivo DOM")
                                    const codigop = document.querySelector("div > div > div > a > p").lastChild.textContent;
                                    const codigopr = codigop.replace("\t\t\t\t\t\t\t\t\t\t", "");
                                    const descricao = document.querySelector("#promocoes > div > div > div > a > h4").textContent;

                                    var vendedor = row.name;
                                    

                                    var msgaddlist = "Scherer " + codSch + " adicionado a lista de requisição:\n\n" + "   *(" + codigopr +  " )* \n\n" + descricao;
                                    client.sendMessage(msg.from, msgaddlist);
                                    console.log("5/5 Done: " + codSch) //LOG

                                   
                                    var strinf = stringify(datahorario);
                                    console.log("6/5 Usado stringify em Obj Data")

                                    saveDBL(codSch, codigopr, vendedor, datahorario);
                                    console.log("7/5 Propriedades salvas em list.db")
                                    //Busca todas as linhas na tabela list, formata o conteúdo e envia para si mesmo (msg.to):
                                    dbl.all("SELECT * FROM list", function(err, rows) {
                                        var texto = JSON.stringify(rows);
                                        
                                        texto2 = texto.replaceAll("{", "\n");
                                        texto3 = texto2.replaceAll('"id":', "");
                                        texto4 = texto3.replaceAll('"codScherer":', "");
                                        texto5 = texto4.replaceAll('"codIndustria":" ', "");
                                        texto6 = texto5.replaceAll('"usuario":', "");
                                        texto7 = texto6.replaceAll('"', "");
                                        texto8 = texto7.replaceAll(",", "  ");
                                        texto9 = texto8.replaceAll("[", "");
                                        texto10 = texto9.replaceAll("]", "");
                                        texto11 = texto10.replaceAll("}", "");
                                        texto12 = texto11.replaceAll("data:","");
                                        console.log(texto12)

                                        client.sendMessage(eu, texto12); 
                                        console.log("end.")
                                    });
                                } 
                                catch (err) {            
                                    client.sendMessage(msg.from, "Nenhum produto encontrado!");
                                    console.error(err)
                                    console.log("-Nenhum produto encontrado!") 
                                }
                } 
            }    

        });
    }

    
    

    


   

   















});











    
process.on("SIGINT", async () => {
    console.log("(SIGINT) Shutting down...");
    await client.destroy();
    process.exit(0);
    })

    


client.initialize();

// Group check
//Add #msg (N serie turbina)            if (isNaN(codSch) === false) {
