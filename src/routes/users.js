const Router = require('@koa/router');
const c = require('../controllers/users');

const router = new Router({ prefix: '/api/users' });

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.delete);

module.exports = router;