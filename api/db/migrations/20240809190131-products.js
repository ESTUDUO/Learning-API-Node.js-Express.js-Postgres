'use strict'

const { CATEGORY_TABLE } = require('./../models/category.model')
const { PRODUCT_TABLE } = require('./../models/product.model')
const { DataTypes, Sequelize } = require('sequelize')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(CATEGORY_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            image: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
                field: 'created_at',
                defaultValue: Sequelize.NOW
            }
        })
        await queryInterface.createTable(PRODUCT_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            image: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            price: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
                field: 'created_at',
                defaultValue: Sequelize.NOW
            },
            categoryId: {
                field: 'category_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: { model: CATEGORY_TABLE, key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        })
    },

    async down(queryInterface) {
        await queryInterface.dropTable(CATEGORY_TABLE)
        await queryInterface.dropTable(PRODUCT_TABLE)
    }
}
