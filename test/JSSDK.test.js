const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const JSSDK = Wechat.JSSDK;
const MongoStore = Wechat.MongoStore;

const wx = new Wechat(config);
const wxMongo = new Wechat(Object.assign({
  store: new MongoStore(),
}, config));


describe('JSSDK', function () {

  describe('@constructor()', function () {
    this.timeout(20000);
    it('should use custom store', function(done) {
      new Wechat(Object.assign({
        store: new MongoStore(),
        clearCountInterval: 1000,
      }, config));
      setTimeout(done, 2000);
    });
  });

  describe('#getAccessToken()', function () {
    this.timeout(20000);
    it('should get wechat token', function (done) {
      wx.jssdk.getAccessToken().then(function (data) {
        data.should.have.property('access_token');
        done();
      });
    });

    it('should get wechat token failed', function (done) {
      //use a custom instance
      const wx = new Wechat(config);
      wx.jssdk.wechatConfig.appId = 'invalid_app_id';
      wx.jssdk.getAccessToken()
        .catch((reason) => {
          reason.should.not.have.property('access_token');
        })
        .then(() => done())
    });

  });

  describe('#getWechatTicket()', function () {
    this.timeout(20000);
    it('should not get ticket with the invalid token', function (done) {
      wx.jssdk.getWechatTicket('invalid_access_token')
        .catch((result) => {
          result.should.not.have.property('ticket');
        })
        .then(() => done());
    });
  });

  describe('#getSignatureByURL()', function () {
    this.timeout(20000);
    it('should get signature', function (done) {
      const url = 'http://localhost?test_signature';
      wx.jssdk.getSignatureByURL(url)
        .then(function (signature) {
          signature.should.be.an('object');
          signature.should.have.property('url').equal(url);
          signature.should.have.property('nonceStr');
          signature.should.have.property('signature');
          signature.should.have.property('timestamp');
          done();
        });
    });
    it('@MongoStore should get signature', function (done) {
      const url = 'http://localhost?' + Math.random();
      wxMongo.jssdk.getSignatureByURL(url)
        .then(function (signature) {
          signature.should.be.an('object');
          signature.should.have.property('url').equal(url);
          signature.should.have.property('nonceStr');
          signature.should.have.property('signature');
          signature.should.have.property('timestamp');
          done();
        });
    });

    it('should get new signature even if signature is not expired', function (done) {
      const url = 'http://localhost?' + Math.random();
      wx.jssdk.getSignatureByURL(url, true)
        .then(function (signature) {
          signature.should.be.an('object');
          signature.should.have.property('url').equal(url);
          signature.should.have.property('nonceStr');
          signature.should.have.property('signature');
          signature.should.have.property('timestamp');
          done();
        });
    });
    it('@MongoStore should get new signature even if signature is not expired', function (done) {
      const url = 'http://localhost?test_signature';
      wxMongo.jssdk.getSignatureByURL(url, true)
        .then(function (signature) {
          signature.should.be.an('object');
          signature.should.have.property('url').equal(url);
          signature.should.have.property('nonceStr');
          signature.should.have.property('signature');
          signature.should.have.property('timestamp');
          done();
        });
    });
  });

  describe('#isTokenExpired()', function () {
    it('should be expired for the token', function () {
      const modifyDate = new Date(2016, 11, 11).getTime();
      const expired = JSSDK.isTokenExpired(modifyDate);
      expired.should.be.equal(true);
    });
  });

  describe('#signatureResult()', function () {
    it('should return empty object', function () {
      const result = JSSDK.signatureResult(undefined);
      result.should.be.deep.equal({});
    });
    it('should return filtered object', function () {
      const result = JSSDK.signatureResult({
        timestamp: 'aaa',
        nonceStr: 'bbb',
        signature: 'ccc',
        url: 'http://localhost',
        extra: 'should not include this',
      });
      result.should.not.have.property('extra');
      result.should.have.property('signature').be.equal('ccc');
    });
  });

  describe('#normalizeUrl()', function () {
    it('should return url without hash', function() {
      const baseUrl = 'http://localhost?a=b';
      const url = baseUrl + '#hash';
      const result = JSSDK.normalizeUrl(url);
      result.should.be.equal(baseUrl);
    });
  });

  describe('#verifySignature()', function () {
    it('should pass the signature verification', function() {
      const query = {
        timestamp: 'abc',
        nonce: 'xyz',
        signature: '4241c4733092f8733df37930576473d51aa2cbcc',
      };
      const verified = wx.jssdk.verifySignature(query);
      verified.should.be.equal(true);
    });
  });

  describe('#getCachedUrlSignature()', function () {
    this.timeout(20000);
    it('should get the specified url signature', function (done) {
      const url = 'http://localhost?' + Math.random();
      wx.jssdk.createNewSignature(url)
        .then(() => {
          return wx.jssdk.getCachedUrlSignature(url);
        })
        .then((result) => {
          result.should.have.property('signature');
          result.url.should.be.equal(url);
          done();
        })
    });
  });

  describe('#saveNewSignature()', function () {
    this.timeout(20000);
    it('should update existing signature', function (done) {
      const mockUrl = 'http://localhost/saveNewSignature';
      const mock = {
        url: mockUrl,
        signature: 'old_mock_signature',
      };
      wx.jssdk.store.setNewSignature(mock.url, mock)
        .then(() => {
          return wx.jssdk.saveNewSignature({
            url: mockUrl,
            signature: 'new_mock_signature',
          });
        })
        .then(() => wx.jssdk.store.getCachedSignatureByUrl(mockUrl))
        .then((newSig) => {
          newSig.signature.should.be.equal('new_mock_signature');
          newSig.url.should.be.equal(mockUrl);
          done();
        });
    });
    it('@MongoStore should update existing signature', function (done) {
      const mockUrl = 'http://localhost/saveNewSignature';
      const mock = {
        url: mockUrl,
        signature: 'old_mock_signature',
      };
      wxMongo.jssdk.store.setNewSignature(mock.url, mock)
        .then(() => {
          return wxMongo.jssdk.saveNewSignature({
            url: mockUrl,
            signature: 'new_mock_signature',
          });
        })
        .then(() => wxMongo.jssdk.store.getCachedSignatureByUrl(mockUrl))
        .then((newSig) => {
          newSig.signature.should.be.equal('new_mock_signature');
          newSig.url.should.be.equal(mockUrl);
          done();
        });
    });
  });



});