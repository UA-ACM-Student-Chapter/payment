var express = require('express');
var bodyParser = require("body-parser");
var braintree = require("braintree");
var app = express();

app.use(express.static('./'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });
  

var gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

app.get('/', function (req, res) {
	res.send("index.html");
});

app.get("/client_token", function (req, res) {
  console.log("hello");
  gateway.clientToken.generate({}, function (err, response) {
    res.send(response.clientToken);
	});
});

app.get("/pages/success.html", function(req, res) {
	res.send("/pages/success.html");
});

app.post("/checkout", function (req, res) {
	var nonceFromTheClient = req.body.nonce;
	var userEmail = req.body.email;
	var shirtSize = req.body.size;
	gateway.transaction.sale({
  	amount: "10.00",
  	paymentMethodNonce: nonceFromTheClient,
		options: {
			submitForSettlement: true,
			venmo: {}
		},
	deviceData: req.body.device_data
	}, function (err, result) {
		if (result.success) {
			console.log("successful payment");
			var sa = require('superagent');
			sa.post("https://ua-acm-web-util.herokuapp.com/member/payforsemester").send({purchaseID: result.transaction.id, size: shirtSize, email: userEmail, datePaid: result.transaction.createdAt.substring(0,10), paymentType: result.transaction.paymentInstrumentType}).end(function(err, response) {
				res.send(response);
			});
		}
		else {
			console.log("unsuccessful payment");
			res.send("bad");
		}
	});
});

app.post("/validate", function(req, res) {
	gateway.transaction.find(req.body.id, function (err, transaction) {
		console.log(transaction);
		if (transaction != null && transaction.statusHistory[0].user == req.body.email) res.send("yes");
		else res.send("no");
	});
});

app.listen(process.env.PORT || 3000, function() {
	console.log("Listening on port 3000");
});
