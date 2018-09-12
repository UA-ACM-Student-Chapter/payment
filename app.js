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

var braintreeEnvironment = braintree.Environment.Sandbox;
if (process.env.IS_PRODUCTION == "true") {
	braintreeEnvironment = braintree.Environment.Production;
}

var gateway = braintree.connect({
  environment: braintreeEnvironment,
  merchantId: process.env.MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

app.get('/', function (req, res) {
	res.send("index.html");
});

app.get('/wakeup', function (req, res) {
	res.send("awake");
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
  	amount: process.env.DUES_COST,
  	paymentMethodNonce: nonceFromTheClient,
		options: {
			submitForSettlement: true,
			venmo: {}
		},
	customer: {
		email: userEmail	
	},
	deviceData: req.body.device_data
	}, function (err, result) {
		if (result.success) {
			console.log("successful payment");
			var sa = require('superagent');
			var last4 = "";
			var cardType = "";
			if (result.transaction.paymentInstrumentType == "credit_card") {
				last4 = result.transaction.creditCard.last4;
				cardType = result.transaction.creditCard.cardType;
			}
			else if (result.transaction.paymentInstrumentType == "venmo_account") {
				last4 = result.transaction.venmoAccount.venmoUserId;
				cardType = "Venmo";
			}
			sa.post("https://" + process.env.HEROKU_INSTANCE_NAME + ".herokuapp.com/member/payforsemester").send({purchaseID: result.transaction.id, size: shirtSize, email: userEmail, datePaid: result.transaction.createdAt.substring(0,10), paymentType: result.transaction.paymentInstrumentType, last4: last4, cardType: cardType}).end(function(err, response) {
				res.send(response);
			});
		}
		else {
			console.log("unsuccessful payment");
			console.log(result);
			res.send({'text': "{\"success\":false, \"errorMessage\": \"Transaction is not valid\"}"});
		}
	});
});

app.post("/validate", function(req, res) {
	gateway.transaction.find(req.body.id, function (err, transaction) {
		console.log(transaction);
		console.log(req.body);
		if (transaction != null && transaction.customer.email == req.body.email) {
			console.log("transaction for " + transaction.customer.email + "is valid for date " + transaction.createdAt.substring(0,10));
			res.send(transaction.createdAt.substring(0,10));
		}
		else res.send("no");
	});
});

app.listen(process.env.PORT || 3000, function() {
	console.log("Listening on port 3000");
});
