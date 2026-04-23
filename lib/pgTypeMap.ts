import { DataType } from './types'

const MAP: Record<string, DataType> = {
  text: 'TEXT',
  varchar: 'TEXT',
  'character varying': 'TEXT',
  char: 'TEXT',
  character: 'TEXT',
  name: 'TEXT',
  citext: 'TEXT',
  integer: 'INTEGER',
  int: 'INTEGER',
  int4: 'INTEGER',
  int2: 'INTEGER',
  int8: 'INTEGER',
  bigint: 'INTEGER',
  smallint: 'INTEGER',
  serial: 'INTEGER',
  bigserial: 'INTEGER',
  numeric: 'NUMERIC',
  decimal: 'NUMERIC',
  real: 'NUMERIC',
  float4: 'NUMERIC',
  float8: 'NUMERIC',
  'double precision': 'NUMERIC',
  money: 'NUMERIC',
  boolean: 'BOOLEAN',
  bool: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  'timestamp without time zone': 'TIMESTAMP',
  'timestamp with time zone': 'TIMESTAMP',
  timestamptz: 'TIMESTAMP',
  date: 'TIMESTAMP',
  uuid: 'UUID',
}

export function pgTypeToDataType(pgType: string): DataType {
  return MAP[pgType.toLowerCase()] ?? 'TEXT'
}
