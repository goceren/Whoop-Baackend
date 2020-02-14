
/*
users
---------------
handle --> kullanıcı adı
email --> email adresi
userId --> PRİMARY KEY
createdAt --> kayıt edilme tarihi
imageUrl --> profil fotoğrafı url
bio ---> hakkımda
birthday --> doğum günü
location --> konumu
website --> web adresi

*/
/*
whoops
---------------------
userHandle --> kullanıcı adı
body ---> içerik
createdAt --> oluşturulma tarihi
likeCount --> like sayacı
commentCount --> yorum sayacı
userImage --> kullanıcı fotoğrafı

*/
/*
comments
---------------
userHandle : kullanıcı adı
whoopId : whoop primaryKey
body : içerik
createdAt: oluşturulma tarihi
userImage : kullanıcı resmi
*/
/*
likes
-----------------
userHandle : beğenen kullanıcı adı
whoopID : beğenilen whoop
*/
/*
notifications
--------------------------
recipient: beğenilen kullanıcı adı
sender: beğenen kullanıcı adı
read: bildirim okunmuş mu
whoopId: beğenilen whoop IDsi
type: bildirim yorum mu like mi 
createdAt: oluşturulma tarihi
*/


let database = {
  users: [
    {
      userId: 'demo',
      email: 'goceren@goceren.com',
      handle: 'goceren',
      createdAt: 'demo',
      imageUrl: 'demo',
      bio: 'Prototip',
      website: 'https://goceren.com',
      location: 'kayseri',
      birthday: 'demo'
    }
  ],
  whoops: [
    {
      userHandle: 'goceren',
      body: 'demo',
      createdAt: 'Demo',
      likeCount: 12,
      commentCount: 7,
      userImage: 'url'
    }
  ],
  comments: [
    {
      userHandle: 'goceren',
      whoopId: 'deneme',
      body: 'demo',
      createdAt: 'Demo'
    }
  ],
  notifications: [
    {
      recipient: 'veli',
      sender: 'ali',
      read: 'true | false',
      whoopId: 'deneme',
      type: 'like | comment',
      createdAt: 'Demo'
    }
  ],
  likes: [
    {
      userHandle: 'test',
      whoopId: "ldklsjf646564"
    }
  ]
};

const userDetails = {

  // Redux 

  credentials: {
    userId: 'goceren',
    email: 'goceren@goceren.com',
    handle: 'user',
    createdAt: 'Demo',
    imageUrl: 'demo',
    bio: 'deneme',
    website: 'https://goceren.com',
    location: 'Kayseri',
    birthday: '14 11 6699'
  },
  likes: [
    {
      userHandle: 'gocerne',
      whoopId: 'goceren'
    },
    {
      userHandle: 'goceren',
      whoopId: 'goceren'
    }
  ]
};
