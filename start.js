//Importando recursos:
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({ 
    
    puppeteer: { 
        product: "chrome", 
        executablePath: "/usr/bin/chromium-browser"
        headless: true,
        args: ['--no-sandbox']
    },
    
    
    authStrategy: new LocalAuth()   //
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
var db = new sqlite3.Database('users.db');
var dbl = new sqlite3.Database('list.db');
//Criando tabela "users" com as colunas Id, Number, Name, caso não existe:
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, number INTEGER, name TEXT)')
})

//
dbl.serialize(() => {
    dbl.run('CREATE TABLE IF NOT EXISTS list (id INTEGER PRIMARY KEY, codScherer INTEGER, codIndustria TEXT, usuario TEXT)')
})
//Função para salvar valores nas colunas:
async function saveDBL(xl, yl, zl){
    return dbl.run('INSERT INTO list (codScherer, codIndustria, usuario) VALUES (?, ?, ?)',[xl, yl, zl]);
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




//Abrindo função principal de automatizaçao:
client.on('message', async msg => {
    //Se msg = "!cadastrar":
    if (msg.body === '!cadastrar') {
        console.log(msg.from, " ", msg.body, " ", msg.timestamp, " ", msg.deviceType) //LOG 

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
        console.log(msg.from, " ", msg.body, " ", msg.timestamp, " ", msg.deviceType) //LOG

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
        console.log(codSch);
        let URL = 'https://www.scherer-sa.com.br/promocoes?parametro=cod_scherer&busca=' + codSch;        
        console.log("-Definindo URL");

        //Importa DOM da URL variável definida:
        try {
            console.log(URL)
            console.log("-Importando arquivo DOM");
            const { data } = await axios.get(URL);
            const dom = new JSDOM(data);
            const { document } = dom.window
            console.log("-Arquivo DOM importado");

            const codigop = document.querySelector("div > div > div > a > p").lastChild.textContent;
            const codigopr = codigop.replace("\t\t\t\t\t\t\t\t\t\t", "");
            const descricao = document.querySelector("#promocoes > div > div > div > a > h4").textContent;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            let numero = msg.from.replace("@c.us","");

           
            
            //Busca toda a linha na tabela users que coluna number seja igual ao numero definido (msg.from):
            return db.get('SELECT * FROM users WHERE number = ?', [numero], function(err, row) {
                console.log("numero = " + row)

                //Se conteúdo da linha for igual a "indefinde" (indefinido por estar vazia/inexistente):
                if (row == undefined) {
                    client.sendMessage(msg.from, "Este número ainda não está registrado, envie o comando *!cadastrar* para se vincular um nome a esse contato.");
                }
    
    
                //Do contrário:
                else {
                    /* var msgconfir = "Scherer: " + codSch   + "\n código: *(" + codigopr +  " )*\n Adicionar a lista de requisição?"; 
                    client.sendMessage(msg.from, msgconfir);
 */
                    
                    var vendedor = row.name;
                    console.log(vendedor)
                    var msgaddlist = "Scherer " + codSch + " adicionado a lista de requisição:\n\n" + "   *(" + codigopr +  " )* \n\n" + descricao;
                    client.sendMessage(msg.from, msgaddlist);
                    console.log(msg.from, " ", msg.body, " ", msg.timestamp, " ", msg.deviceType) //LOG
                    saveDBL(codSch, codigopr, vendedor);

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
                          console.log(texto11)
                          client.sendMessage(msg.to, texto11);
                        
            
                    
                    
                    });
                      

                    
                }
    
            })

           

           
        
        } 
        //Em caso de erro: 
        catch (err) {
            
            client.sendMessage(msg.from, "Nenhum produto encontrado!");
            console.error(err)
            console.log("-Nenhum produto encontrado!")



            
          
        }    
    }
    
    
    

    
   


    else if (msg.body.startsWith('!local')) {
        console.log("Localizador A")
        var localz = msg.location;
        client.sendMessage(msg.from, localz);
        console.log(localz)

             
                
    } 


/* 

     else if (msg.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);
    }

 */















});











    

    


client.initialize();

// Group check
//Add #msg (N serie turbina)
