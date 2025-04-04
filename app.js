const createError = require('http-errors');
const express = require('express');
const cors = require("cors")
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require("fs")
const updateOrderStatuses =require("./updateOrderStatuses") 
const cleanupUnusedFiles = require("./cleanupUnusedFiles")
require("dotenv").config()

const app = express();
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api",require("./routes")) 

//Раздавать файлы из папки uploads
app.use("/uploads", express.static("uploads"))

if(!fs.existsSync("uploads")){
  fs.mkdirSync("uploads")
}
if(!fs.existsSync("uploads/avatar")){
  fs.mkdirSync("uploads/avatar")
}
if(!fs.existsSync("uploads/products")){
  fs.mkdirSync("uploads/products")
}
updateOrderStatuses();





app.use(function(req, res, next) {
  next(createError(404));
});


app.use(function(err, req, res, next) {
  
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;