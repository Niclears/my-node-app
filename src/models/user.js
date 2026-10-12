const { ObjectId } = require('mongodb');

class User {
  static get col() {
    return global.__db.collection('users');
  }

  static async findAll() {
    return this.col.find({}).toArray();
  }

  static async findAllPaged({ page = 1, limit = 10, group_name, course, age_min, age_max, sort, search } = {}) {
    const filter = {};
    if (group_name) filter.group_name = group_name;
    if (course) filter.course = course;
    if (age_min || age_max) {
      filter.age = {};
      if (age_min) filter.age.$gte = age_min;
      if (age_max) filter.age.$lte = age_max;
    }
    if (search) filter.$text = { $search: search };

    const total = await this.col.countDocuments(filter);
    let cursor = this.col.find(filter);
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      cursor = cursor.sort({ [field]: desc ? -1 : 1 });
    } else {
      cursor = cursor.sort({ _id: 1 });
    }
    const items = await cursor.skip((page - 1) * limit).limit(limit).toArray();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async findById(id) {
    if (!ObjectId.isValid(id)) return null;
    return this.col.findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email) {
    return this.col.findOne({ email });
  }

  static async create(data) {
    const r = await this.col.insertOne(data);
    return { _id: r.insertedId, ...data };
  }

  static async update(id, data) {
    if (!ObjectId.isValid(id)) return null;
    await this.col.updateOne({ _id: new ObjectId(id) }, { $set: data });
    return this.findById(id);
  }

  static async delete(id) {
    if (!ObjectId.isValid(id)) return false;
    const r = await this.col.deleteOne({ _id: new ObjectId(id) });
    return r.deletedCount > 0;
  }

  static async stats() {
    const [s] = await this.col.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, averageAge: { $avg: '$age' } } }
    ]).toArray();
    const byGroup = await this.col.aggregate([
      { $group: { _id: '$group_name', count: { $sum: 1 } } }
    ]).toArray();
    const byCourse = await this.col.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]).toArray();
    return {
      total: s?.total || 0,
      averageAge: Number(s?.averageAge || 0).toFixed(1),
      byGroup: Object.fromEntries(byGroup.map((g) => [g._id, g.count])),
      byCourse: Object.fromEntries(byCourse.filter((c) => c._id != null).map((c) => [c._id, c.count]))
    };
  }
}

module.exports = User;
