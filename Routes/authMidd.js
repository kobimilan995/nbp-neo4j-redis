
//export auth middelware
var authenticated = function (req, res, next) {
    if(req.session.user != undefined)
        {
          next();
        }
      else
      {
          res.redirect('/');
          return;
      }
  }

  module.exports = authenticated;