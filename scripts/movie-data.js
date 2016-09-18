//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

//var cheerio = require('cheerio');

function getMovieInfo(name, callback) {
  var encoded = encodeURIComponent(name)
  httpGetAsync(
    "https://api.themoviedb.org/3/search/movie?api_key=9cf85d75b4512c1419098a22cfd0e94e&language=en-US&query="+encoded,
    function (data) {
      //data = JSON.parse(data)
      var movie = {}
      movie.title = data.results[0].title
      movie.summary = data.results[0].overview
      movie.img = "http://image.tmdb.org/t/p/w185/" + data.results[0].poster_path
      movie.ratings = {}
      //callback(movie)
      httpGetAsync(
        'https://www.rottentomatoes.com/m/' + movie.title.replace(/ /g, "_"),
        function(data) {
          var rating_text = $(data).find('#tomato_meter_link').text().trim()

          movie.ratings.rottenTomatoes = rating_text.slice(0,2)
          if (movie && callback)
            callback(movie)
        }
      )
      // httpGetAsync(
      //   'https://www.rottentomatoes.com/m/' + movie.title.replace(/ /g, "_").replace(/the_/i, ""),
      //   function(data) {
      //     var rating_text = $(data).find('#tomato_meter_link').text().trim()
      //
      //     movie.ratings.rottenTomatoes = rating_text.slice(0,2)
      //     if (movie && callback)
      //       callback(movie)
      //   }
      // )
    }
  )
}


function httpGetAsync(theUrl, callback) {

    $.ajax('https://cors-anywhere.herokuapp.com/' +theUrl, {success: callback});
}

getMovieInfo("soylent green")

