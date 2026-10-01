require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

function validate(data, isUpdate = false) {
  const errors = [];
  const { name, group_name, course, grade } = data;
  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
      errors.push('name: от 2 до 100 символов');
    }
  }
  if (!isUpdate || group_name !== undefined) {
    if (!group_name || !/^ББМО-\d{2}-\d{2}$/.test(group_name)) {
      errors.push('group_name: формат ББМО-XX-XX');
    }
  }
  if (!isUpdate || course !== undefined) {
    if (!Number.isInteger(course) || course < 1 || course > 4) {
      errors.push('course: целое от 1 до 4');
    }
  }
  if (grade !== undefined && grade !== null) {
    if (typeof grade !== 'number' || grade < 0 || grade > 5) {
      errors.push('grade: от 0 до 5');
    }
  }
  return errors;
}


class StudentDAO {
  async create(data) {
    const errors = validate(data);
    if (errors.length) throw new Error(errors.join('; '));
    const [r] = await pool.query(
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      [data.name, data.group_name, data.course, data.grade ?? null]
    );
    return this.findById(r.insertId);
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findAll({ limit = 10, offset = 0, group_name, course, grade_min, grade_max, sort } = {}) {
    const where = [];
    const params = [];
    if (group_name) { where.push('group_name = ?'); params.push(group_name); }
    if (course !== undefined) { where.push('course = ?'); params.push(course); }
    if (grade_min !== undefined) { where.push('grade >= ?'); params.push(grade_min); }
    if (grade_max !== undefined) { where.push('grade <= ?'); params.push(grade_max); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let orderSql = 'ORDER BY id';
    if (sort) {
      const dir = sort.startsWith('-') ? 'DESC' : 'ASC';
      const field = sort.replace(/^-/, '');
      if (['name', 'grade', 'created_at', 'course'].includes(field)) {
        orderSql = `ORDER BY ${field} ${dir}`;
      }
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM students ${whereSql}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM students ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      items: rows,
      total,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  }

  async update(id, data) {
    const errors = validate(data, true);
    if (errors.length) throw new Error(errors.join('; '));

    const fields = [];
    const values = [];
    for (const k of ['name', 'group_name', 'course', 'grade']) {
      if (data[k] !== undefined) {
        fields.push(`${k} = ?`);
        values.push(data[k]);
      }
    }
    if (!fields.length) return this.findById(id);

    values.push(id);
    const [r] = await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
    if (r.affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    const [r] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    return r.affectedRows > 0;
  }

  async search(query) {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE name LIKE ?',
      [`%${query}%`]
    );
    return rows;
  }

  async getStats() {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        AVG(grade) AS avgGrade,
        MIN(grade) AS minGrade,
        MAX(grade) AS maxGrade
      FROM students
    `);
    const [byGroup] = await pool.query(
      'SELECT group_name, COUNT(*) AS count FROM students GROUP BY group_name'
    );
    const [byCourse] = await pool.query(
      'SELECT course, COUNT(*) AS count FROM students GROUP BY course'
    );
    return {
      total: stats[0].total,
      avgGrade: Number(stats[0].avgGrade || 0).toFixed(2),
      minGrade: stats[0].minGrade,
      maxGrade: stats[0].maxGrade,
      byGroup,
      byCourse
    };
  }
}

(async () => {
  const dao = new StudentDAO();

  console.log('=== Создание с валидацией ===\n');
  try {
    const s = await dao.create({ name: 'Анна', group_name: 'ББМО-01-23', course: 2, grade: 4.7 });
    console.log(`✔ Создан: id=${s.id}, name=${s.name}`);
  } catch (e) {
    console.log('✖', e.message);
  }
  try {
    await dao.create({ name: 'A', group_name: 'XXX', course: 9, grade: 7 });
  } catch (e) {
    console.log('✖ Валидация сработала:', e.message);
  }

  console.log('\n=== Пагинация ===\n');
  const page = await dao.findAll({ limit: 3, offset: 0 });
  console.log(`Всего: ${page.total}, страница ${page.page}/${page.pages}`);
  page.items.forEach((s) => console.log(`  id=${s.id}, name=${s.name}, grade=${s.grade}`));

  console.log('\n=== Фильтры ===\n');
  const filt = await dao.findAll({ group_name: 'ББМО-01-23', grade_min: 4, sort: '-grade' });
  filt.items.forEach((s) => console.log(`  ${s.name} — ${s.grade}`));

  console.log('\n=== Поиск ===\n');
  const found = await dao.search('Ан');
  found.forEach((s) => console.log(`  id=${s.id}, name=${s.name}`));

  console.log('\n=== Статистика ===\n');
  const stats = await dao.getStats();
  console.log(`Всего: ${stats.total}`);
  console.log(`Средний балл: ${stats.avgGrade}`);
  console.log('По группам:', stats.byGroup);
  console.log('По курсам:', stats.byCourse);

  await pool.end();
})();