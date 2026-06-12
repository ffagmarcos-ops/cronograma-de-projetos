import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export const getDb = async () => {
  return open({
    filename: path.join(__dirname, '../../database.sqlite'),
    driver: sqlite3.Database
  });
};
