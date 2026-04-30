/**
 * Direct database test - verify model operations work
 */

const { sequelize, Orders } = require('./models');

async function testDirectOperations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check an existing order
    const order = await Orders.findByPk(4);
    console.log('📦 Order ID 4:', JSON.stringify(order?.toJSON(), null, 2));

    if (order) {
      // Try updating directly
      console.log('\n🔄 Attempting update...');
      const updated = await order.update({ status: 'completed' });
      console.log('✅ Update success:', updated.get());
    }

    // Try delete
    if (order) {
      console.log('\n🗑️  Attempting delete...');
      const deleted = await order.destroy();
      console.log('✅ Delete success');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
}

testDirectOperations();
