
//export auth middelware
var authenticated = function (req, res, next) {
    console.log(req.param);
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