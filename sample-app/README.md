# Sample Paranoid-Compliant Application

This is a sample application that allows a user to initiate the Paranoid login flow, display Paranoid-masked data, and store additional arbitrary fields (which can be Paranoid-masked data).

## Instructions

1. Create new virtualenv.
2. Install requirements:

   ```sh
   pip install -r requirements.txt
   ```

3. Run migrations

   ```sh
   python manage.py migrate
   ```

4. Start Django server

   ```sh
   python manage.py runserver
   ```

## TODO

- [x] Create basic models
- [x] Create registration flow
- [x] Create login flow
- [x] Display placeholder-masked data on some page
- [ ] Allow user to add new placeholder-masked data
