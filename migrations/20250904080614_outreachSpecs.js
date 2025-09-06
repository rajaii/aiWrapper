/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('outreach_specs', (table) => {
    table.increments('id').primary();
    table.string('email', 320).notNullable().unique();
    table.text('message').notNullable();
    table.timestamp('date_of_sending', { useTz: true }).notNullable();
    table.text('profile_summary').notNullable();
    table.integer('emails_sent').notNullable().defaultTo(0);

    table.index(['date_of_sending'], 'outreach_specs_date_of_sending_idx');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('outreach_specs');
};
