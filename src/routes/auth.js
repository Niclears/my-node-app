const Router = require('@koa/router');
const c = require('../controllers/auth');

const router = new Router({ prefix: '/api/auth' });

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);

module.exports = router;