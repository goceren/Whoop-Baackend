const { admin, database } = require('./admin');

module.exports = (request, response, next) => {
  let idToken;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = request.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('Token bulunamadı');
    return response.status(403).json({ error: 'Giriş Yapmalısınız..' });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      request.user = decodedToken;
      return database
        .collection('users')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      request.user.handle = data.docs[0].data().handle;
      request.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch((err) => {
      console.error('Token eşleşmedi ', err);
      return response.status(403).json(err);
    });
};
