var express = require('express');
var bodyParser = require("body-parser");
var braintree = require("braintree");
var sa = require('superagent');
var app = express();

app.use(express.static('./'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

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
	res.append('Access-Control-Allow-Origin', '*');
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
			submitForSettlement: true
		}
	}, function (err, result) {
		if (result.success) {
			sa.post("https://requestb.in/1o21q7c1").send({transaction: result.transaction.id, size: shirtSize, email: userEmail}).end(function(err, res) {
			});
			res.append('Access-Control-Allow-Origin', '*');
			res.send("ok");
		}
	});
});

app.post("/validate", function(req, res) {
	gateway.transaction.find(req.body.id, function (err, transaction) {
		console.log(transaction);
		res.append('Access-Control-Allow-Origin', '*');
		if (transaction == null) res.send("no");
		else res.send("yes");
	});
});

app.listen(process.env.PORT || 3000, function() {
	console.log("Listening on port 3000");
});
