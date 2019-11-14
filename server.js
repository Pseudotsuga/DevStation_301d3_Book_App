'use strict';

// Application Dependencies
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);


// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;
client.connect();
client.on('error', error => {
  console.error(error);
});

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
app.get('/', newSearch);
app.get('/search', searchRender)
app.post('/searches', createSearch);
app.get('/books/:id', booksParamPlaceHolder)

app.get('*', (request, response) => response.status(404).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// HELPER FUNCTIONS
function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  let httpRegex = /^(http:\/\/)/g
  this.title = info.title ? info.title : 'No title available';
  this.author = info.authors ? info.authors[0] : 'No author available';
  this.isbn = info.industryIdentifiers ? `ISBN_13 ${info.industryIdentifiers[0].identifier}` : 'No ISBN available';
  this.image_url = info.imageLinks ? info.imageLinks.smallThumbnail.replace(httpRegex, 'https://') : placeholderImage;
  this.description = info.description ? info.description : 'No description available';
  this.id = info.industryIdentifiers ? `${info.industryIdentifiers[0].identifier}` : '';
}

function newSearch(request, response) {
  const bookSQL = 'SELECT * FROM books';
  client.query(bookSQL)
    .then( results => {
      if (results.rowCount === 0) {
        response.render('pages/searches/newsearch.ejs');
      }
      else {
        response.render('pages/index.ejs', {books: results.rows});
      }
    })
    .catch( error => {
      console.error(error);
    });
}

function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  superagent.get(url)
    .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
    .then(results => response.render('pages/searches/show', { searchResults: results }))
    .catch(err => handleError(err, response));
}

function searchRender(req, res){
  res.render('pages/searches/newsearch');
}

function booksParamPlaceHolder(request, response){
  const SQL = 'SELECT * FROM BOOKS WHERE id=$1';
  const values = [request.params.id];

  client.query(SQL, values)
    .then( result => {
      console.log(result);
      response.render('pages/details', {book: result.rows[0]})
    })
    .catch(error => console.error(error));
}

function handleError(error, response) {
  response.render('pages/error', { error: error });
}
