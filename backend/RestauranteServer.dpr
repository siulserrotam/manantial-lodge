program RestauranteServer;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  System.IOUtils,
  System.Variants,
  Winapi.ActiveX,
  System.Win.ComObj,
  Data.DB,
  FireDAC.Comp.Client,
  FireDAC.DApt,
  FireDAC.Stan.Param,
  FireDAC.Stan.Def,
  FireDAC.Stan.Async,
  FireDAC.Stan.ExprFuncs,
  FireDAC.Phys,
  FireDAC.Phys.MSAcc,
  IdContext,
  IdCustomHTTPServer,
  IdHTTPServer;

const
  ServerPort = 9000;
  RpcEChangedMode = HRESULT($80010106);

type
  TServerApp = class
  public
    procedure CommandGet(AContext: TIdContext; ARequestInfo: TIdHTTPRequestInfo;
      AResponseInfo: TIdHTTPResponseInfo);
  end;

procedure TryExecSQL(Connection: TFDConnection; const SQL: string);
begin
  try
    Connection.ExecSQL(SQL);
  except
    on E: Exception do
    begin
      // Columnas existentes: no hay nada que migrar.
    end;
  end;
end;

function DatabasePath: string;
begin
  Result := TPath.Combine(TPath.GetFullPath('..\data'), 'negocio.accdb');
end;

function InitializeComForThread: Boolean;
var
  HR: HRESULT;
begin
  HR := CoInitializeEx(nil, COINIT_APARTMENTTHREADED);
  Result := (HR = S_OK) or (HR = S_FALSE);

  if not Result and (HR <> RpcEChangedMode) then
    raise Exception.Create('No se pudo inicializar COM para usar Access. Codigo: ' + IntToHex(HR, 8));
end;

procedure EnsureAccessFile;
var
  Catalog: OleVariant;
  ConnectionString: string;
begin
  TDirectory.CreateDirectory(TPath.GetDirectoryName(DatabasePath));

  if TFile.Exists(DatabasePath) then
    Exit;

  ConnectionString :=
    'Provider=Microsoft.ACE.OLEDB.12.0;' +
    'Data Source=' + DatabasePath + ';' +
    'Jet OLEDB:Engine Type=5;';

  Catalog := Unassigned;
  try
    try
      Catalog := CreateOleObject('ADOX.Catalog');
      Catalog.Create(ConnectionString);
    except
      on E: Exception do
        raise Exception.Create(
          'No se pudo crear la base de datos Access. Revise que Microsoft Access Database Engine ' +
          'este instalado para la misma plataforma del proyecto (Win32 o Win64). Detalle: ' + E.Message);
    end;
  finally
    Catalog := Unassigned;
  end;

  if not TFile.Exists(DatabasePath) then
    raise Exception.Create('Access no creo el archivo de base de datos: ' + DatabasePath);
end;

function WebPath(const FileName: string): string;
begin
  Result := TPath.GetFullPath(TPath.Combine('..\web', FileName));
end;

function NewConnection: TFDConnection;
begin
  Result := TFDConnection.Create(nil);
  Result.DriverName := 'MSAcc';
  Result.Params.Values['Database'] := DatabasePath;
  Result.LoginPrompt := False;
  Result.Connected := True;
end;

procedure EnsureDatabase;
var
  Connection: TFDConnection;
  ComInitialized: Boolean;
begin
  ComInitialized := InitializeComForThread;
  Connection := nil;

  try
    EnsureAccessFile;
    Connection := NewConnection;

    TryExecSQL(Connection,
      'CREATE TABLE funcionarios (' +
      'id AUTOINCREMENT CONSTRAINT pk_funcionarios PRIMARY KEY, ' +
      'nombre TEXT(100) NOT NULL, ' +
      'usuario TEXT(60) NOT NULL, ' +
      'clave TEXT(100) NOT NULL, ' +
      'identificacion TEXT(40), ' +
      'celular TEXT(40), ' +
      'email TEXT(120), ' +
      'rol TEXT(40) DEFAULT ''administrador'', ' +
      'activo LONG DEFAULT 1, ' +
      'creado_en DATETIME DEFAULT Now())'
    );
    TryExecSQL(Connection, 'CREATE UNIQUE INDEX idx_funcionarios_usuario ON funcionarios (usuario)');
    TryExecSQL(Connection, 'ALTER TABLE funcionarios ADD COLUMN identificacion TEXT(40)');
    TryExecSQL(Connection, 'ALTER TABLE funcionarios ADD COLUMN celular TEXT(40)');
    TryExecSQL(Connection, 'ALTER TABLE funcionarios ADD COLUMN email TEXT(120)');

    TryExecSQL(Connection,
      'CREATE TABLE inventario (' +
      'id AUTOINCREMENT CONSTRAINT pk_inventario PRIMARY KEY, ' +
      'nombre TEXT(120) NOT NULL, ' +
      'categoria TEXT(40) NOT NULL, ' +
      'unidad TEXT(40) DEFAULT ''unidad'', ' +
      'cantidad LONG DEFAULT 0, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE productos (' +
      'id AUTOINCREMENT CONSTRAINT pk_productos PRIMARY KEY, ' +
      'nombre TEXT(120) NOT NULL, ' +
      'categoria TEXT(40) NOT NULL, ' +
      'precio LONG DEFAULT 0, ' +
      'imagen LONGTEXT, ' +
      'inventario_id LONG, ' +
      'cantidad_inventario LONG DEFAULT 1, ' +
      'activo LONG DEFAULT 1, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE inventario_movimientos (' +
      'id AUTOINCREMENT CONSTRAINT pk_inventario_movimientos PRIMARY KEY, ' +
      'inventario_id LONG NOT NULL, ' +
      'tipo TEXT(20) NOT NULL, ' +
      'cantidad LONG NOT NULL, ' +
      'motivo LONGTEXT, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection, 'ALTER TABLE productos ADD COLUMN inventario_id INTEGER');
    TryExecSQL(Connection, 'ALTER TABLE productos ADD COLUMN cantidad_inventario INTEGER NOT NULL DEFAULT 1');
    TryExecSQL(Connection, 'ALTER TABLE productos ADD COLUMN imagen LONGTEXT');

    TryExecSQL(Connection,
      'CREATE TABLE reservas (' +
      'id AUTOINCREMENT CONSTRAINT pk_reservas PRIMARY KEY, ' +
      'cabana_id LONG NOT NULL, ' +
      'nombre TEXT(120) NOT NULL, ' +
      'identificacion TEXT(40) NOT NULL, ' +
      'email TEXT(120) NOT NULL, ' +
      'celular TEXT(40) NOT NULL, ' +
      'estado TEXT(30) DEFAULT ''pendiente'', ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE mesas (' +
      'id AUTOINCREMENT CONSTRAINT pk_mesas PRIMARY KEY, ' +
      'nombre TEXT(60) NOT NULL, ' +
      'estado TEXT(30) DEFAULT ''disponible'', ' +
      'creado_en DATETIME DEFAULT Now())'
    );
    TryExecSQL(Connection, 'CREATE UNIQUE INDEX idx_mesas_nombre ON mesas (nombre)');

    TryExecSQL(Connection,
      'CREATE TABLE pedidos (' +
      'id AUTOINCREMENT CONSTRAINT pk_pedidos PRIMARY KEY, ' +
      'mesa_id LONG NOT NULL, ' +
      'estado TEXT(30) DEFAULT ''abierto'', ' +
      'total LONG DEFAULT 0, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE pedido_detalle (' +
      'id AUTOINCREMENT CONSTRAINT pk_pedido_detalle PRIMARY KEY, ' +
      'pedido_id LONG NOT NULL, ' +
      'producto_id LONG NOT NULL, ' +
      'cantidad LONG DEFAULT 1, ' +
      'precio LONG DEFAULT 0)'
    );

    TryExecSQL(Connection,
      'CREATE TABLE pasadias_piscina (' +
      'id AUTOINCREMENT CONSTRAINT pk_pasadias_piscina PRIMARY KEY, ' +
      'personas LONG NOT NULL, ' +
      'valor_persona LONG NOT NULL, ' +
      'total LONG NOT NULL, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE cabanas (' +
      'id AUTOINCREMENT CONSTRAINT pk_cabanas PRIMARY KEY, ' +
      'nombre TEXT(60) NOT NULL, ' +
      'precio_noche LONG DEFAULT 0, ' +
      'estado TEXT(30) DEFAULT ''disponible'', ' +
      'creado_en DATETIME DEFAULT Now())'
    );
    TryExecSQL(Connection, 'CREATE UNIQUE INDEX idx_cabanas_nombre ON cabanas (nombre)');

    TryExecSQL(Connection,
      'CREATE TABLE clientes (' +
      'id AUTOINCREMENT CONSTRAINT pk_clientes PRIMARY KEY, ' +
      'nombre TEXT(120) NOT NULL, ' +
      'tipo TEXT(30) NOT NULL, ' +
      'cabana_id LONG, ' +
      'estado TEXT(30) DEFAULT ''abierto'', ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE cuenta_cargos (' +
      'id AUTOINCREMENT CONSTRAINT pk_cuenta_cargos PRIMARY KEY, ' +
      'cliente_id LONG NOT NULL, ' +
      'concepto TEXT(180) NOT NULL, ' +
      'valor LONG DEFAULT 0, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE recibos (' +
      'id AUTOINCREMENT CONSTRAINT pk_recibos PRIMARY KEY, ' +
      'cliente_id LONG NOT NULL, ' +
      'total LONG DEFAULT 0, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'CREATE TABLE gastos (' +
      'id AUTOINCREMENT CONSTRAINT pk_gastos PRIMARY KEY, ' +
      'categoria TEXT(60) NOT NULL, ' +
      'detalle LONGTEXT, ' +
      'valor LONG DEFAULT 0, ' +
      'creado_en DATETIME DEFAULT Now())'
    );

    TryExecSQL(Connection,
      'INSERT INTO funcionarios (id, nombre, usuario, clave, rol, activo) VALUES ' +
      '(1, ''Administrador'', ''admin'', ''admin123'', ''administrador'', 1)'
    );
    TryExecSQL(Connection,
      'INSERT INTO funcionarios (id, nombre, usuario, clave, rol, activo) VALUES ' +
      '(2, ''Operador Restaurante'', ''operador'', ''operador123'', ''operador'', 1)'
    );

    TryExecSQL(Connection, 'INSERT INTO inventario (id, nombre, categoria, unidad, cantidad) VALUES (1, ''Carne para sancocho'', ''comida'', ''porcion'', 20)');
    TryExecSQL(Connection, 'INSERT INTO inventario (id, nombre, categoria, unidad, cantidad) VALUES (2, ''Trucha'', ''comida'', ''unidad'', 12)');
    TryExecSQL(Connection, 'INSERT INTO inventario (id, nombre, categoria, unidad, cantidad) VALUES (3, ''Limonada'', ''bebida'', ''vaso'', 30)');
    TryExecSQL(Connection, 'INSERT INTO inventario (id, nombre, categoria, unidad, cantidad) VALUES (4, ''Cerveza nacional'', ''bebida'', ''unidad'', 48)');

    TryExecSQL(Connection, 'INSERT INTO productos (id, nombre, categoria, precio, inventario_id, cantidad_inventario) VALUES (1, ''Sancocho campestre'', ''restaurante'', 28000, 1, 1)');
    TryExecSQL(Connection, 'INSERT INTO productos (id, nombre, categoria, precio, inventario_id, cantidad_inventario) VALUES (2, ''Trucha con patacon'', ''restaurante'', 32000, 2, 1)');
    TryExecSQL(Connection, 'INSERT INTO productos (id, nombre, categoria, precio, inventario_id, cantidad_inventario) VALUES (3, ''Limonada natural'', ''bar'', 8000, 3, 1)');
    TryExecSQL(Connection, 'INSERT INTO productos (id, nombre, categoria, precio, inventario_id, cantidad_inventario) VALUES (4, ''Cerveza nacional'', ''bar'', 7000, 4, 1)');

    Connection.ExecSQL('UPDATE productos SET inventario_id = 1, cantidad_inventario = 1 WHERE id = 1');
    Connection.ExecSQL('UPDATE productos SET inventario_id = 2, cantidad_inventario = 1 WHERE id = 2');
    Connection.ExecSQL('UPDATE productos SET inventario_id = 3, cantidad_inventario = 1 WHERE id = 3');
    Connection.ExecSQL('UPDATE productos SET inventario_id = 4, cantidad_inventario = 1 WHERE id = 4');

    TryExecSQL(Connection, 'INSERT INTO mesas (id, nombre, estado) VALUES (1, ''Mesa 1'', ''disponible'')');
    TryExecSQL(Connection, 'INSERT INTO mesas (id, nombre, estado) VALUES (2, ''Mesa 2'', ''disponible'')');

    TryExecSQL(Connection, 'INSERT INTO cabanas (id, nombre, precio_noche, estado) VALUES (1, ''Cabana 101'', 160000, ''disponible'')');
    TryExecSQL(Connection, 'INSERT INTO cabanas (id, nombre, precio_noche, estado) VALUES (2, ''Cabana 102'', 180000, ''disponible'')');

    Connection.ExecSQL(
      'UPDATE cabanas SET nombre = ''Cabana 101'' WHERE id = 1 AND nombre = ''Cabana 1'''
    );
    Connection.ExecSQL(
      'UPDATE cabanas SET nombre = ''Cabana 102'' WHERE id = 2 AND nombre = ''Cabana 2'''
    );
  finally
    Connection.Free;
    if ComInitialized then
      CoUninitialize;
  end;
end;

function EscapeJson(const Value: string): string;
begin
  Result := Value;
  Result := StringReplace(Result, '\', '\\', [rfReplaceAll]);
  Result := StringReplace(Result, '"', '\"', [rfReplaceAll]);
  Result := StringReplace(Result, #13, '\r', [rfReplaceAll]);
  Result := StringReplace(Result, #10, '\n', [rfReplaceAll]);
end;

function JsonText(const Value: string): string;
begin
  Result := '"' + EscapeJson(Value) + '"';
end;

function JsonStringValue(Body: TJSONObject; const Name: string): string;
var
  JsonValue: TJSONValue;
begin
  Result := '';
  JsonValue := Body.GetValue(Name);
  if Assigned(JsonValue) then
    Result := JsonValue.Value;
end;

function ReadRequestBody(ARequestInfo: TIdHTTPRequestInfo): string;
var
  Reader: TStringStream;
begin
  Result := '';

  if not Assigned(ARequestInfo.PostStream) then
  begin
    Result := ARequestInfo.UnparsedParams;
    Exit;
  end;

  ARequestInfo.PostStream.Position := 0;
  Reader := TStringStream.Create('', TEncoding.UTF8);
  try
    Reader.CopyFrom(ARequestInfo.PostStream, ARequestInfo.PostStream.Size);
    Result := Reader.DataString;
  finally
    Reader.Free;
  end;
end;

procedure SendJson(AResponseInfo: TIdHTTPResponseInfo; StatusCode: Integer; const Content: string);
begin
  AResponseInfo.ResponseNo := StatusCode;
  AResponseInfo.ContentType := 'application/json; charset=utf-8';
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Origin'] := '*';
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Headers'] := 'Content-Type';
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Methods'] := 'GET, POST, OPTIONS';
  AResponseInfo.ContentText := Content;
end;

function ContentTypeForFile(const FileName: string): string;
var
  Extension: string;
begin
  Extension := LowerCase(TPath.GetExtension(FileName));

  if Extension = '.html' then
    Result := 'text/html; charset=utf-8'
  else if Extension = '.css' then
    Result := 'text/css; charset=utf-8'
  else if Extension = '.js' then
    Result := 'application/javascript; charset=utf-8'
  else
    Result := 'application/octet-stream';
end;

procedure SendFile(AResponseInfo: TIdHTTPResponseInfo; const FileName: string);
var
  FilePath: string;
begin
  FilePath := WebPath(FileName);

  if not TFile.Exists(FilePath) then
  begin
    SendJson(AResponseInfo, 404, '{"ok":false,"message":"Archivo no encontrado"}');
    Exit;
  end;

  AResponseInfo.ResponseNo := 200;
  AResponseInfo.ContentType := ContentTypeForFile(FilePath);
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Origin'] := '*';
  AResponseInfo.ContentText := TFile.ReadAllText(FilePath, TEncoding.UTF8);
end;

procedure HandleLogin(ARequestInfo: TIdHTTPRequestInfo; AResponseInfo: TIdHTTPResponseInfo);
var
  BodyText: string;
  BodyValue: TJSONValue;
  Body: TJSONObject;
  Usuario: string;
  Clave: string;
  Connection: TFDConnection;
  Query: TFDQuery;
  Content: string;
  ComInitialized: Boolean;
begin
  BodyValue := nil;
  try
    BodyText := ReadRequestBody(ARequestInfo);
    BodyValue := TJSONObject.ParseJSONValue(BodyText);
    try
      if not (BodyValue is TJSONObject) then
      begin
        SendJson(AResponseInfo, 400, '{"ok":false,"message":"Solicitud invalida"}');
        Exit;
      end;

      Body := TJSONObject(BodyValue);
      Usuario := LowerCase(Trim(JsonStringValue(Body, 'usuario')));
      Clave := JsonStringValue(Body, 'clave');

      if (Usuario = '') or (Clave = '') then
      begin
        SendJson(AResponseInfo, 400, '{"ok":false,"message":"Usuario y clave son obligatorios"}');
        Exit;
      end;

      Connection := nil;
      Query := nil;
      ComInitialized := InitializeComForThread;
      try
        Connection := NewConnection;
        Query := TFDQuery.Create(nil);
        Query.Connection := Connection;
        Query.SQL.Text :=
          'SELECT id, nombre, usuario, rol, identificacion, celular, email ' +
          'FROM funcionarios ' +
          'WHERE usuario = :usuario AND clave = :clave AND activo = 1';
        Query.ParamByName('usuario').AsString := Usuario;
        Query.ParamByName('clave').AsString := Clave;
        Query.Open;

        if Query.IsEmpty then
        begin
          SendJson(AResponseInfo, 401, '{"ok":false,"message":"Credenciales incorrectas"}');
          Exit;
        end;

        Content :=
          '{"ok":true,' +
          '"message":"Ingreso correcto",' +
          '"funcionario":{' +
          '"id":' + Query.FieldByName('id').AsString + ',' +
          '"nombre":' + JsonText(Query.FieldByName('nombre').AsString) + ',' +
          '"usuario":' + JsonText(Query.FieldByName('usuario').AsString) + ',' +
          '"identificacion":' + JsonText(Query.FieldByName('identificacion').AsString) + ',' +
          '"celular":' + JsonText(Query.FieldByName('celular').AsString) + ',' +
          '"email":' + JsonText(Query.FieldByName('email').AsString) + ',' +
          '"rol":' + JsonText(Query.FieldByName('rol').AsString) +
          '}}';

        SendJson(AResponseInfo, 200, Content);
      finally
        Query.Free;
        Connection.Free;
        if ComInitialized then
          CoUninitialize;
      end;
    finally
      BodyValue.Free;
    end;
  except
    on E: Exception do
      SendJson(AResponseInfo, 500,
        '{"ok":false,"message":"Error en login: ' + EscapeJson(E.Message) + '"}');
  end;
end;

procedure HandleCreateFuncionario(ARequestInfo: TIdHTTPRequestInfo; AResponseInfo: TIdHTTPResponseInfo);
var
  BodyText: string;
  BodyValue: TJSONValue;
  Body: TJSONObject;
  Usuario: string;
  Clave: string;
  Identificacion: string;
  Nombre: string;
  Celular: string;
  Email: string;
  Rol: string;
  Connection: TFDConnection;
  Query: TFDQuery;
  ComInitialized: Boolean;
begin
  BodyValue := nil;
  Connection := nil;
  Query := nil;
  try
    BodyText := ReadRequestBody(ARequestInfo);
    BodyValue := TJSONObject.ParseJSONValue(BodyText);
    if not (BodyValue is TJSONObject) then
    begin
      SendJson(AResponseInfo, 400, '{"ok":false,"message":"Solicitud invalida"}');
      Exit;
    end;

    Body := TJSONObject(BodyValue);
    Usuario := LowerCase(Trim(JsonStringValue(Body, 'usuario')));
    Clave := JsonStringValue(Body, 'clave');
    Identificacion := Trim(JsonStringValue(Body, 'identificacion'));
    Nombre := Trim(JsonStringValue(Body, 'nombre'));
    Celular := Trim(JsonStringValue(Body, 'celular'));
    Email := Trim(JsonStringValue(Body, 'email'));
    Rol := LowerCase(Trim(JsonStringValue(Body, 'rol')));

    if not ((Rol = 'administrador') or (Rol = 'operador')) then
      Rol := 'operador';

    if (Usuario = '') or (Clave = '') or (Identificacion = '') or (Nombre = '') then
    begin
      SendJson(AResponseInfo, 400, '{"ok":false,"message":"Usuario, clave, identificacion y nombre son obligatorios"}');
      Exit;
    end;

    ComInitialized := InitializeComForThread;
    try
      Connection := NewConnection;
      Query := TFDQuery.Create(nil);
      Query.Connection := Connection;
      Query.SQL.Text := 'SELECT id FROM funcionarios WHERE usuario = :usuario';
      Query.ParamByName('usuario').AsString := Usuario;
      Query.Open;

      if not Query.IsEmpty then
      begin
        SendJson(AResponseInfo, 409, '{"ok":false,"message":"Ya existe un funcionario con ese usuario"}');
        Exit;
      end;

      Query.Close;
      Query.SQL.Text :=
        'INSERT INTO funcionarios (nombre, usuario, clave, identificacion, celular, email, rol, activo) ' +
        'VALUES (:nombre, :usuario, :clave, :identificacion, :celular, :email, :rol, 1)';
      Query.ParamByName('nombre').AsString := Nombre;
      Query.ParamByName('usuario').AsString := Usuario;
      Query.ParamByName('clave').AsString := Clave;
      Query.ParamByName('identificacion').AsString := Identificacion;
      Query.ParamByName('celular').AsString := Celular;
      Query.ParamByName('email').AsString := Email;
      Query.ParamByName('rol').AsString := Rol;
      Query.ExecSQL;

      SendJson(AResponseInfo, 200, '{"ok":true,"message":"Funcionario creado"}');
    finally
      Query.Free;
      Connection.Free;
      if ComInitialized then
        CoUninitialize;
    end;
  except
    on E: Exception do
      SendJson(AResponseInfo, 500,
        '{"ok":false,"message":"Error creando funcionario: ' + EscapeJson(E.Message) + '"}');
  end;
  if Assigned(BodyValue) then
    BodyValue.Free;
end;

procedure TServerApp.CommandGet(AContext: TIdContext; ARequestInfo: TIdHTTPRequestInfo;
  AResponseInfo: TIdHTTPResponseInfo);
begin
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Origin'] := '*';
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Headers'] := 'Content-Type';
  AResponseInfo.CustomHeaders.Values['Access-Control-Allow-Methods'] := 'GET, POST, OPTIONS';

  if ARequestInfo.Command = 'OPTIONS' then
  begin
    AResponseInfo.ResponseNo := 204;
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/api/health') then
  begin
    SendJson(AResponseInfo, 200, '{"ok":true,"service":"Finca Campestre REST"}');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and
    ((ARequestInfo.Document = '/') or (ARequestInfo.Document = '/index.html')) then
  begin
    SendFile(AResponseInfo, 'index.html');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/admin.html') then
  begin
    SendFile(AResponseInfo, 'admin.html');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/cliente.html') then
  begin
    SendFile(AResponseInfo, 'cliente.html');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/styles.css') then
  begin
    SendFile(AResponseInfo, 'styles.css');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/app.js') then
  begin
    SendFile(AResponseInfo, 'app.js');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/public.js') then
  begin
    SendFile(AResponseInfo, 'public.js');
    Exit;
  end;

  if (ARequestInfo.Command = 'GET') and (ARequestInfo.Document = '/client.js') then
  begin
    SendFile(AResponseInfo, 'client.js');
    Exit;
  end;

  if (ARequestInfo.Command = 'POST') and (ARequestInfo.Document = '/api/login') then
  begin
    HandleLogin(ARequestInfo, AResponseInfo);
    Exit;
  end;

  if (ARequestInfo.Command = 'POST') and (ARequestInfo.Document = '/api/funcionarios') then
  begin
    HandleCreateFuncionario(ARequestInfo, AResponseInfo);
    Exit;
  end;

  SendJson(AResponseInfo, 404, '{"ok":false,"message":"Ruta no encontrada"}');
end;

var
  App: TServerApp;
  Server: TIdHTTPServer;

begin
  try
    EnsureDatabase;

    App := TServerApp.Create;
    Server := TIdHTTPServer.Create(nil);
    try
      Server.DefaultPort := ServerPort;
      Server.OnCommandGet := App.CommandGet;
      Server.Active := True;

      Writeln('Servidor REST iniciado');
      Writeln('URL: http://localhost:' + IntToStr(ServerPort));
      Writeln('Pagina publica: http://localhost:' + IntToStr(ServerPort) + '/');
      Writeln('Login funcionarios: http://localhost:' + IntToStr(ServerPort) + '/admin.html');
      Writeln('API login: POST http://localhost:' + IntToStr(ServerPort) + '/api/login');
      Writeln('Base de datos: ' + DatabasePath);
      Writeln('Presiona ENTER para cerrar.');
      Readln;

      Server.Active := False;
    finally
      Server.Free;
      App.Free;
    end;
  except
    on E: Exception do
    begin
      Writeln(E.ClassName + ': ' + E.Message);
      Readln;
    end;
  end;
end.
