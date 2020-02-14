const { database } = require('../util/admin');

// BÜTÜN WHOOPLARI ÇEKME İŞLEMİ

exports.getAllWhoops = (request, response) => {
  database.collection('whoops')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let whoops = [];
      data.forEach((doc) => {
        whoops.push({
          whoopId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return response.json(whoops);
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

// WHOOP ATMA İŞLEMİ

exports.postOneWhoop = (request, response) => {
  if (request.body.body.trim() === '') {
    return response.status(400).json({ body: 'İçerik Boş Olamaz' });
  }

  const newWhoop = {
    body: request.body.body,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
    createdAt: new Date().toString(),
    likeCount: 0,
    commentCount: 0
  };

  database.collection('whoops')
    .add(newWhoop)
    .then((doc) => {
      const resWhoop = newWhoop;
      resWhoop.whoopId = doc.id;
      response.json(resWhoop);
    })
    .catch((err) => {
      response.status(500).json({ error: 'Birşeyler Yanlış Gitti' });
      console.error(err);
    });
};

// WHOOP ÇEKME İŞLEMİ

exports.getWhoop = (request, response) => {
  let whoopData = {};
  database.doc(`/whoops/${request.params.whoopId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Whoop Bulunamadı' });
      }
      whoopData = doc.data();
      whoopData.whoopId = doc.id;
      return database
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('whoopId', '==', request.params.whoopId)
        .get();
    })
    .then((data) => {
      whoopData.comments = [];
      data.forEach((doc) => {
        whoopData.comments.push(doc.data());
      });
      return response.json(whoopData);
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

// YORUM YAPMA İŞLEMİ

exports.commentOnWhoop = (request, response) => {
  if (request.body.body.trim() === '')
    return response.status(400).json({ comment: 'Yorum Boş Olamaz' });

  const newComment = {
    body: request.body.body,
    createdAt: new Date().toString(),
    whoopId: request.params.whoopId,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl
  };
  console.log(newComment);

  database.doc(`/whoops/${request.params.whoopId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Whoop Boş olamaz.' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return database.collection('comments').add(newComment);
    })
    .then(() => {
      response.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      response.status(500).json({ error: 'Birşeyler Yanlış Gitti' });
    });
};

// WHOOP BEĞENME

exports.likeWhoop = (request, response) => {
  const likeDocument = database
    .collection('likes')
    .where('userHandle', '==', request.user.handle)
    .where('whoopId', '==', request.params.whoopId)
    .limit(1);

  const whoopDocument = database.doc(`/whoops/${request.params.whoopId}`);

  let whoopData;

  whoopDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        whoopData = doc.data();
        whoopData.whoopId = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: 'Whoop bulunamadı.' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return database
          .collection('likes')
          .add({
            whoopId: request.params.whoopId,
            userHandle: request.user.handle
          })
          .then(() => {
            whoopData.likeCount++;
            return whoopDocument.update({ likeCount: whoopData.likeCount });
          })
          .then(() => {
            return response.json(whoopData);
          });
      } else {
        return response.status(400).json({ error: 'Whoop zaten beğenildi' });
      }
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

// BEĞENİ GERİ ALMA İŞLEMİ

exports.unlikeWhoop = (request, response) => {
  const likeDocument = database
    .collection('likes')
    .where('userHandle', '==', request.user.handle)
    .where('whoopId', '==', request.params.whoopId)
    .limit(1);

  const whoopDocument = database.doc(`/whoops/${request.params.whoopId}`);

  let whoopData;

  whoopDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        whoopData = doc.data();
        whoopData.whoopId = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: 'Whoop Bulunamadı' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return response.status(400).json({ error: 'Whoop zaten beğenilmemiş' });
      } else {
        return database
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            whoopData.likeCount--;
            return whoopDocument.update({ likeCount: whoopData.likeCount });
          })
          .then(() => {
            response.json(whoopData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

// WHOOP SİLME İŞLEMİ

exports.deleteWhoop = (request, response) => {
  const document = database.doc(`/whoops/${request.params.whoopId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Whoop bulunamadı' });
      }
      if (doc.data().userHandle !== request.user.handle) {
        return response.status(403).json({ error: 'Giriş Yapmalısınız' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      response.json({ message: 'Whoop başarıyla silindi.' });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};
